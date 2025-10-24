import styled from "styled-components";

type Props = {
  height: number;
  width: number;
  showGhost?: boolean;
};

export const StyledStage = styled.div<Props>`
  --boardW: clamp(340px, 20vw, 480px);
  --cell: calc(var(--boardW) / ${(props) => props.width});

  position: relative;
  display: grid;
  grid-template-rows: repeat(${(props) => props.height}, var(--cell));
  grid-template-columns: repeat(${(props) => props.width}, 1fr);
  grid-gap: 0;

  width: var(--boardW);
  height: calc(var(--cell) * ${(props) => props.height});
  overflow: visible;

  > * {
    position: relative;
    z-index: 2;
  }

  /* 🧱 Viền ngoài (trái, phải, dưới) dày hơn, nằm ngoài board, không trong suốt */
  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: -6px; /* mở rộng ra ngoài */
    right: -6px;
    bottom: -6px;
    border-left: 6px solid #dcdcdc;  /* trái */
    border-right: 6px solid #dcdcdc; /* phải */
    border-bottom: 6px solid #dcdcdc; /* dưới */
    border-top: none; /* không có “nắp” phía trên */
    border-radius: 4px;
    z-index: 3;
    pointer-events: none;
  }

  ${(props) =>
    !props.showGhost &&
    `
      div[data-ghost="true"] {
        opacity: 0 !important;
        visibility: hidden !important;
      }
    `}
`;

/* 🧱 Texture nền của board — buffer trong suốt, không che tetromino */
export const BoardBackground = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;

  background-image: url("/img/texture/brick.jpg");
  background-size: var(--cell) var(--cell);
  background-repeat: repeat;
  background-position: center;
  background-color: #1a1a1a;
  image-rendering: pixelated;

  /* Ẩn texture vùng buffer */
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    transparent calc(var(--cell) * 3),
    black calc(var(--cell) * 3 + 1px)
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    transparent calc(var(--cell) * 3),
    black calc(var(--cell) * 3 + 1px)
  );
`;
