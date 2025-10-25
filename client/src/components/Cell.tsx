// File: Cell.tsx (Updated to use textureUtils)

import React from "react";
import { StyledCell } from "./styles/StyledCell";
// Import các hàm helper thay vì TETROMINOES trực tiếp cho việc styling
import { getTetrominoTexture, getTetrominoColor } from "./textureUtils"; // <<< Đảm bảo đường dẫn này đúng

interface CellProps {
  type: string | number;
  isBuffer?: boolean;
}

const Cell: React.FC<CellProps> = ({ type, isBuffer }) => {
  let color: string | undefined;
  let textureUrl: string | undefined;
  // `cellTypeForStyle` sẽ giữ type gốc ('T', 'L', 'garbage', 'ghost', 'W', 0)
  // để StyledCell có thể áp dụng các style đặc biệt nếu cần (vd: ghost, W)
  let cellTypeForStyle: string | number = type;

  const typeStr = String(type); // Chuyển type thành string để xử lý nhất quán

  if (typeStr.startsWith('ghost:')) {
    // --- Ghost Piece ---
    const realType = typeStr.split(':')[1];
    // Ghost dùng màu sáng hơn, không dùng texture
    color = realType === 'O' ? '255, 255, 255' : getTetrominoColor(realType) || '200,200,200'; // Lấy màu gốc, fallback
    cellTypeForStyle = 'ghost'; // Dùng type 'ghost' cho StyledCell
    textureUrl = undefined;

  } else if (typeStr === 'W') {
    // --- Whiteout Cell ---
    color = '255, 255, 255';
    cellTypeForStyle = 'W'; // Dùng type 'W' cho StyledCell
    textureUrl = undefined;

  } else if (typeStr === '0' || type === 0) {
     // --- Empty Cell ---
     color = undefined; // Hoặc '0, 0, 0' nếu bạn muốn màu nền đen nhẹ
     cellTypeForStyle = 0; // Dùng type 0 cho StyledCell
     textureUrl = undefined;

  } else {
    // --- Standard Tetromino, Garbage, hoặc bất kỳ type nào định nghĩa trong textureUtils ---
    cellTypeForStyle = typeStr; // Giữ nguyên type gốc ('T', 'garbage', ...) cho StyledCell

    // ⭐ Ưu tiên lấy texture bằng hàm helper từ textureUtils.ts ⭐
    const texturePath = getTetrominoTexture(typeStr);

    if (texturePath) {
      // Nếu có texture -> tạo url()
      textureUrl = `url(${texturePath})`;
      // Đặt color là undefined để StyledCell không vẽ màu nền che texture
      color = undefined;
      // Hoặc đặt màu fallback nếu muốn màu nền hiển thị sau texture lỗi
      // color = getTetrominoColor(typeStr);
    } else {
      // Nếu không có texture -> lấy màu fallback từ textureUtils.ts
      color = getTetrominoColor(typeStr);
      textureUrl = undefined;
    }
  }

  // Truyền các props đã xác định cho StyledCell
  return (
    <StyledCell
      type={cellTypeForStyle} // Truyền type đã xử lý ('ghost', 'W', 0, 'T', 'garbage'...)
      color={color}           // Có thể là string (màu RGB) hoặc undefined
      texture={textureUrl}      // Có thể là 'url(...)' hoặc undefined
      isBuffer={isBuffer}
    />
  );
};

// Memo vẫn hữu ích để tránh render lại cell không cần thiết
export default React.memo(Cell);