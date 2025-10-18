import styled from "styled-components";
import { TEXTURE_MAP } from "../textureUtils";

type Props = {
  type: string | number;
  color: string;
  isBuffer?: boolean;
}

export const StyledCell = styled.div<Props>`
  width: auto;
  background: ${(props) => {
    const isEmpty = props.type === 0 || props.type === '0';
    const typeStr = String(props.type);
    
  // Empty cells - làm tối hơn để dễ nhìn
  if (props.isBuffer && isEmpty) return 'transparent';
  if (isEmpty) return 'rgba(0, 0, 0, 0.65)'; // Tối hơn từ 0.35 → 0.65
    
    // Special types with solid colors
    if (props.type === 'W') return 'rgba(255,255,255,1)';
    if (props.type === 'garbage') return `rgba(${props.color}, 0.95)`;
    
    // Ghost piece - tăng opacity để thấy rõ hơn trên nền tối
    if (props.type === 'ghost') {
      return `rgba(${props.color}, 0.45)`; // Tăng từ 0.30 → 0.45
    }
    
    // Tetromino blocks with texture
    if (TEXTURE_MAP[typeStr]) {
      return `url(${TEXTURE_MAP[typeStr]})`;
    }
    
    // Fallback to solid color
    return `rgba(${props.color}, 0.8)`;
  }};
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border: ${(props) => {
    const isEmpty = props.type === 0 || props.type === '0';
    const typeStr = String(props.type);
    
    // Buffer rows (3 hàng trên) - viền vàng để phân biệt
    if (props.isBuffer) {
      if (isEmpty) return '1px solid rgba(255, 193, 7, 0.2)';
      return '1px solid rgba(255, 193, 7, 0.4)';
    }
    
    // Vùng chơi chính - viền trùng với màu nền để xoá lưới
    if (isEmpty) return '1px solid rgba(0, 0, 0, 0.65)'; // cùng màu nền ô trống
    if (props.type === 'ghost') return `1px solid rgba(${props.color}, 0.45)`; // trùng màu ghost
    if (props.type === 'garbage') return `1px solid rgba(${props.color}, 0.95)`; // trùng màu garbage

    // Nếu có texture, bỏ viền để không thấy đường lưới
    if (TEXTURE_MAP[typeStr]) return '0px solid transparent';

    // Tetromino không texture - viền trùng màu block
    return `1px solid rgba(${props.color}, 0.8)`;
  }};
  box-shadow: ${(props) => {
    const isEmpty = props.type === 0 || props.type === '0';
    const typeStr = String(props.type);
    if (isEmpty || props.type === 'ghost') return 'none';
    if (TEXTURE_MAP[typeStr]) {
      return 'inset 0 0 10px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)';
    }
    return 'none';
  }};
`;