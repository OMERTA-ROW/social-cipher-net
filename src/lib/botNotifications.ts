import { supabase } from "@/integrations/supabase/client";

export type NotificationType = "spaceship" | "hyperspeed";
export type BotType = "draco" | "zozo";

export interface DracoNotification {
  type: NotificationType;
  destination?: string;
  message?: string;
  bot?: BotType;
}

/**
 * Send a notification to trigger AI bot entrance (Draco or Zozo)
 * @param notification - The notification configuration
 * @example
 * // Trigger Draco spaceship entrance
 * sendBotNotification({ type: "spaceship", bot: "draco" });
 * 
 * // Trigger Zozo hyper speed to specific destination
 * sendBotNotification({ 
 *   type: "hyperspeed", 
 *   bot: "zozo",
 *   destination: "/cyber-world",
 *   message: "New trading signal detected!"
 * });
 */
export async function sendBotNotification(notification: DracoNotification) {
  const channel = supabase.channel('cyberlink-notifications');
  
  await channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.send({
        type: 'broadcast',
        event: 'notification',
        payload: notification,
      });
    }
  });

  // Clean up after sending
  setTimeout(() => {
    supabase.removeChannel(channel);
  }, 1000);
}

/**
 * Trigger Draco spaceship entrance
 */
export async function triggerDracoSpaceship() {
  await sendBotNotification({ type: "spaceship", bot: "draco" });
}

/**
 * Trigger Draco hyper speed jump to destination
 * @param destination - Route to navigate to (e.g., "/cyber-world")
 * @param message - Optional message to display
 */
export async function triggerDracoHyperSpeed(destination: string, message?: string) {
  await sendBotNotification({ 
    type: "hyperspeed", 
    bot: "draco",
    destination,
    message 
  });
}

/**
 * Trigger Zozo spaceship entrance
 */
export async function triggerZozoSpaceship() {
  await sendBotNotification({ type: "spaceship", bot: "zozo" });
}

/**
 * Trigger Zozo hyper speed jump to destination
 * @param destination - Route to navigate to (e.g., "/cyber-world")
 * @param message - Optional message to display
 */
export async function triggerZozoHyperSpeed(destination: string, message?: string) {
  await sendBotNotification({ 
    type: "hyperspeed", 
    bot: "zozo",
    destination,
    message 
  });
}
