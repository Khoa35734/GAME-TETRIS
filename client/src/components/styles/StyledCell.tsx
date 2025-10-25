// File: StyledCell.tsx (Updated)

import styled from "styled-components";
import { TEXTURE_MAP } from "../textureUtils"; // Giữ lại nếu box-shadow cần

// Cập nhật Props
type Props = {
  type: string | number;
  color?: string;      // Color giờ là optional
  texture?: string;   // Thêm texture prop
  isBuffer?: boolean;
};

export const StyledCell = styled.div<Props>`
  width: auto;
  aspect-ratio: 1 / 1;

  /* ================================== */
  /* LOGIC BACKGROUND ĐÃ CẬP NHẬT       */
  /* ================================== */
  background-image: ${props => props.texture || 'none'}; // Ưu tiên background-image từ prop texture
  background-color: ${props => { // Background color sẽ là nền hoặc fallback
    const isEmpty = props.type === 0 || props.type === "0";

    /* Buffer + ô trống -> transparent */
    if (props.isBuffer && isEmpty) return "transparent";

    /* Ô trống trong board -> transparent */
    if (isEmpty) return "transparent"; // Hoặc màu nền nhẹ: "rgba(0, 0, 0, 0.3)"

    /* Ô Whiteout */
    if (props.type === "W") return "rgba(255, 255, 255, 1)";

    /* Ghost block (vẫn dùng màu đã tính toán) */
    if (props.type === "ghost" && props.color) {
      // Logic tính màu ghost giữ nguyên nếu bạn muốn ghi đè màu từ Cell.tsx
      const [r, g, b] = props.color.split(",").map((v) => parseInt(v.trim()));
      const lighter = `${Math.min(r + 50, 255)}, ${Math.min(g + 50, 255)}, ${Math.min(b + 50, 255)}`;
      return `rgba(${lighter}, 0.55)`;
      // Hoặc đơn giản là dùng màu được truyền vào nếu Cell.tsx đã tính
      // return `rgba(${props.color}, 0.55)`;
    }

    /* Các ô có màu (Tetromino, Garbage không có texture) */
    if (props.color && !props.texture) { // Chỉ dùng màu nếu KHÔNG có texture
        return `rgba(${props.color}, 1)`;
    }

    /* Fallback nếu có texture nhưng nó lỗi, hoặc ô đặc biệt không có màu/texture */
    /* Có thể hiện màu color nhẹ phía sau texture */
     if (props.color && props.texture) {
       return `rgba(${props.color}, 0.8)`; // Màu nhẹ phía sau texture
     }

    /* Fallback cuối cùng */
    return 'transparent'; // Tránh hiển thị màu đen không mong muốn

  }};
  /* ================================== */
  /* KẾT THÚC LOGIC BACKGROUND         */
  /* ================================== */

  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  border: none;

  /* Giữ nguyên logic box-shadow */
  box-shadow: ${(props) => {
    const isEmpty = props.type === 0 || props.type === "0";
    const typeStr = String(props.type); // typeStr giờ có thể là 'garbage'

    if ((props.isBuffer && isEmpty) || isEmpty) return "none";
    if (props.type === "ghost") {
      return `
        0 0 4px rgba(255,255,255,0.6),
        inset 0 0 6px rgba(255,255,255,0.4)
      `;
    }
    // Áp dụng bóng nếu ô có texture (dùng props.texture hoặc check TEXTURE_MAP)
    // Hoặc nếu type là garbage (ngay cả khi chỉ có màu)
    if (props.texture || TEXTURE_MAP[typeStr] || props.type === 'garbage') {
      return `
        inset 0 0 6px rgba(0,0,0,0.5),
        0 1px 3px rgba(0,0,0,0.25)
      `;
    }
    return "none";
  }};

  /* KHÔNG dùng visibility nữa để giữ logic buffer gốc của bạn */
  /* visibility: ${props => props.isBuffer ? 'hidden' : 'visible'}; */
`;