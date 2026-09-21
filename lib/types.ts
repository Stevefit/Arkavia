export type Dj = {
  id: number;
  name: string;
  slug: string;
  created_at: string;
};

export type Settings = {
  message_template: string;
  music_url: string;
};

export type GuestComment = {
  id: number;
  dj_id: number | null;
  dj_name?: string | null;
  name: string;
  message: string;
  created_at: string;
};
