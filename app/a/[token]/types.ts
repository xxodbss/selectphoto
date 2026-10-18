// get_album 함수가 돌려주는 모양
export type SharedPhoto = {
  id: string;
  filename: string;
  storage_path: string;
  thumb_path: string;
  rating: number;
  rated_at: number; // 별점을 누른 시각(밀리초), 기기에 보관한 별점과 비교용
};

export type SharedAlbum = {
  title: string;
  five_star_limit: number;
  submitted_at: string | null;
  photos: SharedPhoto[];
};
