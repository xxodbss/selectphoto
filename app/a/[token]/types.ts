// get_album 함수가 돌려주는 모양
export type SharedPhoto = {
  id: string;
  filename: string;
  storage_path: string;
  thumb_path: string;
  rating: number;
};

export type SharedAlbum = {
  title: string;
  five_star_limit: number;
  submitted_at: string | null;
  photos: SharedPhoto[];
};
