import { supabase } from "@/integrations/supabase/client";

export type NotificationType = "spaceship" | "hyperspeed";

export interface DracoNotification {
  type: NotificationType;
  destination?: string;
  message?: string;
}

/**
 * Send a notification to trigger Draco AI entrance
 * @param notification - The notification configuration
 * @example
 * // Trigger spaceship entrance
 * sendDracoNotification({ type: "spaceship" });
 * 
 * // Trigger hyper speed to specific destination
 * sendDracoNotification({ 
 *   type: "hyperspeed", 
 *   destination: "/cyber-world",
 *   message: "New trading signal detected!"
 * });
 */
export async function sendDracoNotification(notification: DracoNotification) {
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
  await sendDracoNotification({ type: "spaceship" });
}

/**
 * Trigger Draco hyper speed jump to destination
 * @param destination - Route to navigate to (e.g., "/cyber-world")
 * @param message - Optional message to display
 */
export async function triggerDracoHyperSpeed(destination: string, message?: string) {
  await sendDracoNotification({ 
    type: "hyperspeed", 
    destination,
    message 
  });
}
