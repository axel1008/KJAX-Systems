export interface AppNotification {
  id: number;
  created_at: string;
  type: string;
  message: string;
  is_read: boolean;
  related_entity_id: string | null;
  related_url: string | null;
  creator_name?: string | null; // Nombre del usuario que generó la notificación
}