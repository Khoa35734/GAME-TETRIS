import styled from "styled-components";
import { TEXTURE_MAP } from "../textureUtils";

type Props = {
  type: string | number;
  color: string;
  isBuffer?: boolean;
};

export const StyledCell = styled.div<Props>`
  width: auto;

  background: ${(props) => {
    const isEmpty = props.type === 0 || props.type === "0";
    const typeStr = String(props.type);

    /* 🟦 Nếu là buffer + ô trống → trong suốt hoàn toàn */
    if (props.isBuffer && isEmpty) return "transparent";

    /* Ô trống (trong vùng board chính) → trong suốt để lộ texture nền */
    if (isEmpty) return "transparent";

    /* Ô đặc biệt */
    if (props.type === "W") return "rgba(255,255,255,1)";
    if (props.type === "garbage") return `rgba(${props.color}, 1)`;

    /* 👻 Ghost block — sáng hơn, có ánh mờ nhẹ để dễ thấy */
    if (props.type === "ghost") {
      const [r, g, b] = props.color.split(",").map((v) => parseInt(v.trim()));
      const lighter = `${Math.min(r + 50, 255)}, ${Math.min(g + 50, 255)}, ${Math.min(b + 50, 255)}`;
      return `rgba(${lighter}, 0.55)`; // sáng hơn và trong suốt vừa phải
    }

    /* Tetromino có texture riêng -> hiển thị ảnh gốc, không blend */
    if (TEXTURE_MAP[typeStr]) {
      return `url(${TEXTURE_MAP[typeStr]})`;
    }

    /* Mặc định màu đặc */
    return `rgba(${props.color}, 1)`;
  }};

  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  border: none;

  /* Đổ bóng nhẹ cho khối Tetromino để nổi bật */
  box-shadow: ${(props) => {
    const isEmpty = props.type === 0 || props.type === "0";
    const typeStr = String(props.type);

    if ((props.isBuffer && isEmpty) || isEmpty) return "none";

    /* ✨ Ghost có viền sáng đặc biệt để tách khỏi nền */
    if (props.type === "ghost") {
      return `
        0 0 4px rgba(255,255,255,0.6),
        inset 0 0 6px rgba(255,255,255,0.4)
      `;
    }

    if (TEXTURE_MAP[typeStr]) {
      return `
        inset 0 0 6px rgba(0,0,0,0.5),
        0 1px 3px rgba(0,0,0,0.25)
      `;
    }

    return "none";
  }};
`;
