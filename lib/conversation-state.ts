import { prisma } from "@/lib/prisma";
import { messagingApi } from "@line/bot-sdk";
import { extractTravelPreferences, generateItinerary } from "@/lib/gemini";

type Message = messagingApi.Message;
type FlexMessage = messagingApi.FlexMessage;

export type ConversationStatus = 
  | "ASK_COUNTRY"
  | "ASK_DAYS"
  | "ASK_BUDGET"
  | "ASK_THEMES"
  | "ASK_MONTH"
  | "READY"
  | "COMPLETED";

export async function getOrCreateConversation(lineUserId: string) {
  // Find active conversation (not completed)
  let conversation = await prisma.conversation.findFirst({
    where: {
      lineUserId,
      status: { not: "COMPLETED" },
    },
    include: { preference: true },
    orderBy: { createdAt: 'desc' }, // Get the most recent conversation
  });

  if (!conversation) {
    // Ensure LineUser exists
    await prisma.lineUser.upsert({
      where: { lineUserId },
      create: { lineUserId },
      update: {},
    });

    conversation = await prisma.conversation.create({
      data: {
        lineUserId,
        status: "ASK_COUNTRY",
        preference: {
          create: {},
        },
      },
      include: { preference: true },
    });
  }

  return conversation;
}

/**
 * 產生行程摘要的 Flex Message
 */
function getItinerarySummaryFlex(
  title: string, 
  country: string, 
  days: string, 
  highlights: string[]
): FlexMessage {
  return {
    type: "flex",
    altText: `✨ ${title} 行程摘要`,
    contents: {
      type: "bubble",
      hero: {
        type: "image",
        url: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80", // 預設旅遊圖片
        size: "full",
        aspectRatio: "20:13",
        aspectMode: "cover",
        action: {
          type: "uri",
          uri: "https://line.me/"
        }
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: title,
            weight: "bold",
            size: "xl",
            wrap: true
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "📍 地點",
                    color: "#aaaaaa",
                    size: "sm",
                    flex: 1
                  },
                  {
                    type: "text",
                    text: country,
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    flex: 5
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "📅 天數",
                    color: "#aaaaaa",
                    size: "sm",
                    flex: 1
                  },
                  {
                    type: "text",
                    text: days,
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    flex: 5
                  }
                ]
              }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              {
                type: "text",
                text: "✨ 行程亮點",
                size: "sm",
                color: "#aaaaaa"
              },
              ...highlights.map(highlight => ({
                type: "text" as const,
                text: `• ${highlight}`,
                wrap: true,
                color: "#666666",
                size: "xs",
                margin: "xs"
              }))
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            action: {
              type: "message",
              label: "查看詳細行程",
              text: "查看詳細行程"
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "message",
              label: "重新規劃",
              text: "重新規劃"
            }
          }
        ],
        flex: 0
      }
    }
  };
}

export async function handleUserMessage(lineUserId: string, text: string, timestamp?: number): Promise<Message[]> {
  const conversation = await getOrCreateConversation(lineUserId);
  const status = conversation.status as ConversationStatus;
  const preferenceId = conversation.preference?.id;

  if (!preferenceId) {
    throw new Error("Preference record missing for conversation");
  }

  // Check if this is the first message in the conversation
  const messageCount = await prisma.message.count({
    where: { conversationId: conversation.id },
  });

  // If this is the first message and status is ASK_COUNTRY, send the first question instead of processing the input
  if (messageCount === 0 && status === "ASK_COUNTRY") {
    const responseMessages = getResponseMessages("ASK_COUNTRY");
    
    // Store Bot Messages
    for (const msg of responseMessages) {
      let contentToStore = "";
      if (msg.type === "text") {
        contentToStore = msg.text;
      } else if (msg.type === "template") {
        contentToStore = `[Template: ${msg.altText}]`;
      } else {
        contentToStore = `[${msg.type}]`;
      }

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "bot",
          content: contentToStore,
        },
      });
    }

    return responseMessages;
  }

  // 1. Store User Message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: text,
      createdAt: timestamp ? new Date(timestamp) : undefined,
    },
  });

  // Handle special commands and feature menu
  // TODO: 未來可整合 Gemini API 來處理這些指令，提供更智能的回應
  if (text === "功能" || text === "選單" || text === "功能列表" || text === "menu") {
    // Show feature menu
    const menuMessages = getFeatureMenuMessage();
    
    // Store Bot Messages
    for (const msg of menuMessages) {
      let contentToStore = "";
      if (msg.type === "text") {
        contentToStore = msg.text;
      } else if (msg.type === "template") {
        contentToStore = `[Template: ${msg.altText}]`;
      } else {
        contentToStore = `[${msg.type}]`;
      }

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "bot",
          content: contentToStore,
        },
      });
    }

    return menuMessages;
  } else if (text === "旅遊推薦" || text === "重新開始" || text === "重新規劃") {
    // Start the travel planning flow (Reset everything)
    await prisma.travelPreference.update({
      where: { id: preferenceId },
      data: {
        country: null,
        days: null,
        budget: null,
        themes: null,
        month: null,
      },
    });
    
    // Clear any existing recommendation for this conversation to ensure fresh generation
    await prisma.travelRecommendation.deleteMany({
      where: { conversationId: conversation.id }
    });
    
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: "ASK_COUNTRY" },
    });
    
    // If it's a "restart" command, send a welcome message with examples
    if (text === "重新開始" || text === "重新規劃") {
        const quickReply = getFeatureQuickReply();
        const welcomeMsg: Message = {
          type: "text",
          text: "已為您重置！請告訴我您的新需求 🌍\n\n我可以根據您的喜好推薦旅遊國家、景點、每日行程。\n\n您可以試著說：\n• 我想去日本五天\n• 幫我安排3月的海島行程\n• 推薦歐洲的文化旅遊",
          quickReply: quickReply
        };

        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "bot",
            content: welcomeMsg.text as string,
          },
        });
        
        return [welcomeMsg];
    }

    const responseMessages = getResponseMessages("ASK_COUNTRY");
    
    // Store Bot Messages
    for (const msg of responseMessages) {
      let contentToStore = "";
      if (msg.type === "text") {
        contentToStore = msg.text;
      } else if (msg.type === "template") {
        contentToStore = `[Template: ${msg.altText}]`;
      } else {
        contentToStore = `[${msg.type}]`;
      }

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "bot",
          content: contentToStore,
        },
      });
    }

    return responseMessages;
  } else if (text === "查詢偏好") {
    // Query user's saved preferences
    const preference = conversation.preference;
    const quickReply = getFeatureQuickReply();
    
    if (preference && (preference.country || preference.days || preference.budget || preference.themes || preference.month)) {
      const preferenceText = `你目前的旅遊偏好：\n${preference.country ? `📍 目的地：${preference.country}\n` : ''}${preference.days ? `📅 天數：${preference.days}\n` : ''}${preference.budget ? `💰 預算：${preference.budget}\n` : ''}${preference.themes ? `🎯 主題：${preference.themes}\n` : ''}${preference.month ? `📆 月份：${preference.month}\n` : ''}\n要開始規劃嗎？直接告訴我你的需求即可！`;
      
      const reply: Message = { type: "text", text: preferenceText, quickReply: quickReply };
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "bot",
          content: preferenceText,
        },
      });
      return [reply];
    } else {
      const reply: Message = { type: "text", text: "目前還沒有保存的偏好設定。\n點擊「旅遊推薦」開始規劃你的行程吧！", quickReply: quickReply };
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "bot",
          content: reply.text as string,
        },
      });
      return [reply];
    }
  } else if (text === "查看上次行程") {
    // View last recommendation
    const quickReply = getFeatureQuickReply();
    const lastRecommendation = await prisma.travelRecommendation.findFirst({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
    });

    if (lastRecommendation) {
      const reply: Message = { type: "text", text: `上次的行程規劃：\n\n${lastRecommendation.content}\n\n要重新規劃嗎？點擊「旅遊推薦」或輸入「重新開始」`, quickReply: quickReply };
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "bot",
          content: lastRecommendation.content,
        },
      });
      return [reply];
    } else {
      const reply: Message = { type: "text", text: "目前還沒有行程規劃記錄。\n點擊「旅遊推薦」開始規劃你的行程吧！", quickReply: quickReply };
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "bot",
          content: reply.text as string,
        },
      });
      return [reply];
    }
  } else if (text === "修改偏好") {
    // Reset preferences and start over
    await prisma.travelPreference.update({
      where: { id: preferenceId },
      data: {
        country: null,
        days: null,
        budget: null,
        themes: null,
        month: null,
      },
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: "ASK_COUNTRY" },
    });

    const responseMessages = getResponseMessages("ASK_COUNTRY");
    
    // Store Bot Messages
    for (const msg of responseMessages) {
      let contentToStore = "";
      if (msg.type === "text") {
        contentToStore = msg.text;
      } else if (msg.type === "template") {
        contentToStore = `[Template: ${msg.altText}]`;
      } else {
        contentToStore = `[${msg.type}]`;
      }

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "bot",
          content: contentToStore,
        },
      });
    }

    return responseMessages;
  }

  // Process input based on CURRENT status
  // Transition to NEXT status
  let nextStatus: ConversationStatus = status;
  
  // Attempt to extract preferences using Gemini (if not in READY state)
  // Only use LLM if we are in a data collection state
  if (status !== "READY" && status !== "COMPLETED") {
    try {
      console.log("Calling Gemini extraction for:", text);
      const extracted = await extractTravelPreferences(text, { currentStatus: status });
      
      if (extracted) {
          // 1. Check if input is INVALID based on Gemini's judgment
          if (extracted.isValid === false && extracted.suggestedReply) {
              console.log("Gemini judged input as invalid:", extracted.suggestedReply);
              
              const quickReply = getFeatureQuickReply();
              const reply: Message = {
                  type: "text",
                  text: extracted.suggestedReply,
                  quickReply: quickReply
              };
              
              await prisma.message.create({
                data: {
                  conversationId: conversation.id,
                  role: "bot",
                  content: reply.text as string,
                },
              });
              
              return [reply];
          }

          // 2. If valid, proceed to update preferences
          if (Object.keys(extracted).some(k => k !== "isValid" && k !== "suggestedReply" && k !== "intent" && extracted[k as keyof typeof extracted] !== null)) {
            console.log("Gemini extracted:", extracted);

            // Update preferences in DB
            await prisma.travelPreference.update({
              where: { id: preferenceId },
              data: {
                ...(extracted.country && { country: extracted.country }),
                ...(extracted.days && { days: extracted.days }),
                ...(extracted.budget && { budget: extracted.budget }),
                ...(extracted.themes && { themes: extracted.themes }),
                ...(extracted.month && { month: extracted.month }),
              },
            });
          }
      }
    } catch (error) {
      console.error("Gemini extraction failed, falling back to rules:", error);
    }
  }

  // Determine next status based on current preferences (Auto-skip filled fields)
  // Refresh preference data to check what's filled
  const currentPref = await prisma.travelPreference.findUnique({
    where: { id: preferenceId }
  });
  
  console.log("Current Preferences after potential LLM update:", currentPref);

  if (currentPref) {
    // Determine the first empty field to ask about
    if (!currentPref.country) nextStatus = "ASK_COUNTRY";
    else if (!currentPref.days) nextStatus = "ASK_DAYS";
    else if (!currentPref.budget) nextStatus = "ASK_BUDGET";
    else if (!currentPref.themes) nextStatus = "ASK_THEMES";
    else if (!currentPref.month) nextStatus = "ASK_MONTH";
    else nextStatus = "READY";
  }
  
  console.log(`Status Transition: ${status} -> ${nextStatus}`);

  // Fallback: If status didn't change (meaning LLM didn't fill the current field), 
  // use rule-based logic to fill the CURRENT field with the raw text
  if (nextStatus === status) {
      // Basic validation: Check if input seems valid before directly assigning it
      // Reduced invalid patterns to allow more flexibility, focusing on format guidance instead
      const invalidPatterns = ["不知道", "沒想法", "隨便", "都可以", "不懂", "不清楚", "無"];
      const isInvalid = invalidPatterns.some(p => text.includes(p)) || text.trim().length < 1;
      
      // Specific validation based on current status to guide user format
      let isFormatInvalid = false;
      
      if (status === "ASK_DAYS") {
          // Must contain at least one digit or specific chinese number characters
          if (!/\d|[一二三四五六七八九十]/.test(text)) isFormatInvalid = true;
      } else if (status === "ASK_BUDGET") {
          // Must contain digits or monetary keywords
          if (!/\d|萬|千|元|塊/.test(text)) isFormatInvalid = true;
      } else if (status === "ASK_MONTH") {
          // Must contain digits or month keywords
          if (!/\d|月|下個|本|年底|年初/.test(text)) isFormatInvalid = true;
      }

      if (isInvalid || isFormatInvalid) {
          // If input format is incorrect, guide user with specific examples
          let retryText = "抱歉，我不太理解您的意思 🤔";
          
          if (status === "ASK_COUNTRY") {
              retryText = "抱歉，請告訴我您想去的「國家」或「城市」\n\n✅ 正確範例：\n• 日本\n• 台北\n• 歐洲";
          } else if (status === "ASK_DAYS") {
              retryText = "請問您預計玩幾天呢？請包含「數字」喔！\n\n✅ 正確範例：\n• 5天\n• 三天兩夜\n• 一週";
          } else if (status === "ASK_BUDGET") {
              retryText = "請問您的預算大概是多少？請包含「金額數字」\n\n✅ 正確範例：\n• 20000\n• 3萬\n• 5000元左右";
          } else if (status === "ASK_MONTH") {
              retryText = "請問您預計幾月出發？請包含「月份數字」\n\n✅ 正確範例：\n• 7月\n• 下個月\n• 年底";
          }
          
          const quickReply = getFeatureQuickReply();
          const retryMsg: Message = {
              type: "text",
              text: retryText,
              quickReply: quickReply
          };
          
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: "bot",
              content: retryMsg.text as string,
            },
          });
          
          return [retryMsg];
      }

      if (status === "ASK_COUNTRY") {
        await prisma.travelPreference.update({
          where: { id: preferenceId },
          data: { country: text },
        });
        // Re-check status after manual update
        const updated = await prisma.travelPreference.findUnique({ where: { id: preferenceId } });
        if (updated?.days) nextStatus = "ASK_BUDGET"; // Skip if next field already filled
        else nextStatus = "ASK_DAYS";
      } else if (status === "ASK_DAYS") {
        await prisma.travelPreference.update({
          where: { id: preferenceId },
          data: { days: text },
        });
        nextStatus = "ASK_BUDGET";
      } else if (status === "ASK_BUDGET") {
        await prisma.travelPreference.update({
          where: { id: preferenceId },
          data: { budget: text },
        });
        nextStatus = "ASK_THEMES";
      } else if (status === "ASK_THEMES") {
        await prisma.travelPreference.update({
          where: { id: preferenceId },
          data: { themes: text },
        });
        nextStatus = "ASK_MONTH";
      } else if (status === "ASK_MONTH") {
        await prisma.travelPreference.update({
          where: { id: preferenceId },
          data: { month: text },
        });
        nextStatus = "READY";
      }
      
      // Final check to ensure we don't ask for something already filled
      const finalCheck = await prisma.travelPreference.findUnique({ where: { id: preferenceId } });
      if (finalCheck) {
        if (!finalCheck.country) nextStatus = "ASK_COUNTRY";
        else if (!finalCheck.days) nextStatus = "ASK_DAYS";
        else if (!finalCheck.budget) nextStatus = "ASK_BUDGET";
        else if (!finalCheck.themes) nextStatus = "ASK_THEMES";
        else if (!finalCheck.month) nextStatus = "ASK_MONTH";
        else nextStatus = "READY";
      }
  }
  
  // Update status in DB if changed
  if (nextStatus !== status) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: nextStatus },
    });
  }

  // Create recommendation if status becomes READY
  if (nextStatus === "READY") {
    console.log("Status is READY, checking recommendation...");
    
    // If we just transitioned to READY (status was not READY), force fresh generation
    // by deleting any old recommendations that might exist from previous cycles
    if (status !== "READY") {
        await prisma.travelRecommendation.deleteMany({
            where: { conversationId: conversation.id }
        });
    }
    
    // Check if recommendation already exists
    const existingRec = await prisma.travelRecommendation.findFirst({
      where: { conversationId: conversation.id }
    });
    
    let flexMessage: FlexMessage | null = null;
    let recommendationContent = "";
    
    if (!existingRec) {
      // Get latest preferences
      const finalPref = await prisma.travelPreference.findUnique({ 
        where: { id: preferenceId } 
      });
      
      console.log("Final Preferences for Generation:", finalPref);

      recommendationContent = "抱歉，行程生成失敗。請稍後再試或重新規劃。";
      let itineraryJson: any = null;

      if (finalPref && finalPref.country && finalPref.days) {
        try {
          console.log("Calling generateItinerary...");
          itineraryJson = await generateItinerary({
            country: finalPref.country,
            days: finalPref.days,
            budget: finalPref.budget || undefined,
            themes: finalPref.themes || undefined,
            month: finalPref.month || undefined,
          });
          
          console.log("Itinerary Generated:", itineraryJson ? "Success" : "Failed/Null");

          if (itineraryJson) {
            // Format JSON to readable text
            const title = itineraryJson.title || `${finalPref.country} ${finalPref.days} 之旅`;
            const overview = itineraryJson.overview || "";
            
            let details = "";
            const highlights: string[] = [];

            if (Array.isArray(itineraryJson.itinerary)) {
              details = itineraryJson.itinerary.map((day: any) => {
                const activities = Array.isArray(day.activities) 
                  ? day.activities.map((act: any) => {
                      const query = encodeURIComponent(`${finalPref.country} ${act.title}`);
                      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
                      return `• ${act.time}: ${act.title}\n  ${act.description}\n  🗺️ ${mapUrl}`;
                    }).join("\n\n")
                  : "";
                
                // Collect highlights (e.g., first activity of each day, up to 3)
                if (highlights.length < 3 && Array.isArray(day.activities) && day.activities.length > 0) {
                    highlights.push(day.activities[0].title);
                }
                
                const meals = day.meals 
                  ? `🍽️ 午餐: ${day.meals.lunch}\n🍽️ 晚餐: ${day.meals.dinner}`
                  : "";

                return `📅 Day ${day.day}: ${day.theme}\n${activities}\n\n${meals}`;
              }).join("\n\n-------------------\n\n");
            }

            recommendationContent = `✨ ${title}\n\n${overview}\n\n${details}\n\n💡 小撇步:\n${Array.isArray(itineraryJson.tips) ? itineraryJson.tips.join("\n• ") : ""}`;
            
            // Create Flex Message
            flexMessage = getItinerarySummaryFlex(
                title, 
                finalPref.country, 
                finalPref.days, 
                highlights.length > 0 ? highlights : ["精彩行程", "道地美食", "文化體驗"]
            );
          } else {
            // Gemini API failed or not configured
            console.error("Itinerary generation failed: itineraryJson is null");
            recommendationContent = "抱歉，行程生成服務暫時無法使用 (API 回傳空值)。請稍後再試。";
          }
        } catch (error) {
          console.error("Itinerary generation failed with error:", error);
          recommendationContent = "抱歉，行程生成時發生錯誤。請稍後再試。";
        }
      } else {
          console.warn("Missing country or days in preferences, cannot generate itinerary.");
          recommendationContent = "資料不足（缺少國家或天數），無法生成行程。";
      }

      await prisma.travelRecommendation.create({
        data: {
          conversationId: conversation.id,
          content: recommendationContent,
        }
      });
    } else {
      // Use existing recommendation content
      recommendationContent = existingRec.content;
    }
    
    // If flex message was created (new itinerary), return it immediately
    if (flexMessage) {
        // Store Bot Message (summary)
        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                role: "bot",
                content: "[Flex Message] 行程摘要",
            },
        });
        return [flexMessage];
    }
    
    // If no flex message but recommendation exists, return the text content
    if (recommendationContent) {
        const quickReply = getFeatureQuickReply();
        const reply: Message = {
            type: "text",
            text: recommendationContent,
            quickReply: quickReply
        };
        
        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                role: "bot",
                content: recommendationContent,
            },
        });
        return [reply];
    }
    
    // Fallback: if nothing was created, return error message
    const quickReply = getFeatureQuickReply();
    return [{
        type: "text",
        text: "抱歉，無法生成行程。請稍後再試。",
        quickReply: quickReply
    }];
  }

  // Handle "Show Details" command
  if (text === "查看詳細行程") {
      const rec = await prisma.travelRecommendation.findFirst({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: 'desc' }
      });
      
      if (rec) {
          const quickReply = getFeatureQuickReply();
          const reply: Message = { 
              type: "text", 
              text: rec.content, 
              quickReply: quickReply 
          };
          
          await prisma.message.create({
              data: {
                  conversationId: conversation.id,
                  role: "bot",
                  content: rec.content,
              },
          });
          return [reply];
      }
  }

  // Get Bot Response
  const responseMessages = getResponseMessages(nextStatus);

  // 2. Store Bot Messages
  for (const msg of responseMessages) {
    let contentToStore = "";
    if (msg.type === "text") {
      contentToStore = msg.text;
    } else if (msg.type === "template") {
      contentToStore = `[Template: ${msg.altText}]`;
    } else {
      contentToStore = `[${msg.type}]`;
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "bot",
        content: contentToStore,
      },
    });
  }

  // Return message for the NEW status
  return responseMessages;
}

/**
 * 取得 Quick Reply 選單（用於附加在訊息下方）
 * 這會讓功能選單在每條訊息下方都顯示，使用者可以隨時點擊
 * TODO: 未來可整合 Gemini API 來動態生成更個人化的功能列表
 */
export function getFeatureQuickReply() {
  return {
    items: [
      {
        type: "action" as const,
        action: {
          type: "message" as const,
          label: "旅遊推薦",
          text: "旅遊推薦"
        }
      },
      {
        type: "action" as const,
        action: {
          type: "message" as const,
          label: "重新規劃",
          text: "重新規劃"
        }
      },
      {
        type: "action" as const,
        action: {
          type: "message" as const,
          label: "查詢偏好",
          text: "查詢偏好"
        }
      },
      {
        type: "action" as const,
        action: {
          type: "message" as const,
          label: "查看上次行程",
          text: "查看上次行程"
        }
      },
      {
        type: "action" as const,
        action: {
          type: "message" as const,
          label: "修改偏好",
          text: "修改偏好"
        }
      }
    ]
  };
}

/**
 * 取得功能列表訊息（使用 Button Template）
 * 適合作為功能選單，使用者可以隨時查看
 * TODO: 未來可整合 Gemini API 來動態生成更個人化的功能列表
 */
export function getFeatureMenuMessage(): Message[] {
  return [
    {
      type: "template",
      altText: "功能選單",
      template: {
        type: "buttons",
        text: "請選擇功能：",
        actions: [
          {
            type: "message",
            label: "旅遊推薦",
            text: "旅遊推薦"
          },
          {
            type: "message",
            label: "查詢偏好",
            text: "查詢偏好"
          },
          {
            type: "message",
            label: "查看上次行程",
            text: "查看上次行程"
          },
          {
            type: "message",
            label: "修改偏好",
            text: "修改偏好"
          }
        ]
      }
    }
  ];
}

/**
 * 取得歡迎訊息（用於使用者加入好友時）
 * 包含功能介紹和使用範例，並提供 Quick Reply 選單
 * TODO: 未來可整合 Gemini API 來動態生成更個人化的歡迎訊息
 */
export function getWelcomeMessage(): Message[] {
  const quickReply = getFeatureQuickReply();
  return [
    {
      type: "text",
      text: "嗨~很高興認識你！我是你的AI旅遊規劃助理 🌍\n\n我可以根據你的喜好推薦旅遊國家、景點、每日行程。\n\n你可以跟我說：\n• 我想去日本五天\n• 幫我安排3月的海島行程\n• 推薦歐洲的文化旅遊",
      quickReply: quickReply,
    }
  ];
}

export function getResponseMessages(status: ConversationStatus): Message[] {
  const quickReply = getFeatureQuickReply();
  
  switch (status) {
    case "ASK_COUNTRY":
      return [{
        type: "text",
        text: "你想去哪個國家或地區呢？\n例如：日本、韓國、泰國、歐洲、海島等。",
        quickReply: quickReply,
      }];
    case "ASK_DAYS":
      return [{
        type: "text",
        text: "想玩幾天呢？",
        quickReply: quickReply,
      }];
    case "ASK_BUDGET":
      return [{
         type: "text",
         text: "那預算大概多少呢？（可回答區間）",
         quickReply: quickReply,
      }];
    case "ASK_THEMES":
      return [
        {
          type: "template",
          altText: "你想以什麼主題為主？",
          template: {
            type: "buttons",
            text: "你想以什麼主題為主？",
            actions: [
              { label: "美食", type: "message", text: "美食" },
              { label: "自然", type: "message", text: "自然" },
              { label: "購物", type: "message", text: "購物" },
              { label: "海島放鬆", type: "message", text: "海島放鬆" },
            ]
          }
        },
        {
          type: "text",
          text: "或是輸入其他主題（如：文化/博物館）",
          quickReply: {
            items: [
              {
                type: "action",
                action: {
                  type: "message",
                  label: "文化/博物館",
                  text: "文化/博物館"
                }
              },
              {
                type: "action",
                action: {
                  type: "message",
                  label: "歷史古蹟",
                  text: "歷史古蹟"
                }
              },
              {
                type: "action",
                action: {
                  type: "message",
                  label: "冒險活動",
                  text: "冒險活動"
                }
              },
              {
                type: "action",
                action: {
                  type: "message",
                  label: "親子同樂",
                  text: "親子同樂"
                }
              },
              {
                type: "action",
                action: {
                  type: "message",
                  label: "攝影打卡",
                  text: "攝影打卡"
                }
              },
              {
                type: "action",
                action: {
                  type: "message",
                  label: "溫泉泡湯",
                  text: "溫泉泡湯"
                }
              },
              {
                type: "action",
                action: {
                  type: "message",
                  label: "重新規劃",
                  text: "重新規劃"
                }
              }
            ]
          }
        }
      ];
    case "ASK_MONTH":
      return [{
        type: "text",
        text: "預計哪個月份出發呢？\n（例如：3 月、7 月）",
        quickReply: quickReply,
      }];
    case "READY":
      return [
        {
          type: "text",
          text: "太棒了～我已經獲得你的旅遊需求了！\n我正在幫你規劃專屬行程，請稍候 2 秒",
          quickReply: quickReply,
        }
      ];
    default:
      return [{ type: "text", text: "發生錯誤，請稍後再試。" }];
  }
}
