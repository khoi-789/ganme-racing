export type Question = {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  correctOptions: string[]; // Có thể chứa 1 hoặc nhiều đáp án đúng
  timeLimit: number; // Giới hạn thời gian (giây)
};

export const questions: Question[] = [
  {
    id: 'q1',
    text: 'Thành phố nào được mệnh danh là "Hòn ngọc Viễn Đông"?',
    options: [
      { id: 'opt1', text: 'Hà Nội' },
      { id: 'opt2', text: 'Đà Nẵng' },
      { id: 'opt3', text: 'TP. Hồ Chí Minh' },
      { id: 'opt4', text: 'Nha Trang' },
    ],
    correctOptions: ['opt3'],
    timeLimit: 15,
  },
  {
    id: 'q2',
    text: 'Những hành động nào sau đây giúp bảo vệ môi trường?',
    options: [
      { id: 'opt1', text: 'Sử dụng túi nilon dùng 1 lần' },
      { id: 'opt2', text: 'Trồng thêm cây xanh' },
      { id: 'opt3', text: 'Phân loại rác thải' },
      { id: 'opt4', text: 'Đốt rác tự do' },
    ],
    correctOptions: ['opt2', 'opt3'], // Multiple choice
    timeLimit: 20,
  },
  {
    id: 'q3',
    text: 'Ngôn ngữ lập trình nào sau đây phổ biến nhất cho phát triển Web Frontend?',
    options: [
      { id: 'opt1', text: 'Python' },
      { id: 'opt2', text: 'Java' },
      { id: 'opt3', text: 'JavaScript' },
      { id: 'opt4', text: 'C++' },
    ],
    correctOptions: ['opt3'],
    timeLimit: 15,
  },
];
