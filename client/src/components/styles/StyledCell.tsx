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
    
    // Empty cells
    if (props.isBuffer && isEmpty) return 'transparent';
    if (isEmpty) return 'transparent';
    
    // Special types with solid colors
    if (props.type === 'W') return 'rgba(255,255,255,1)';
    if (props.type === 'garbage') return `rgba(${props.color}, 0.95)`;
    
    // Ghost piece (semi-transparent with texture)
    if (props.type === 'ghost') {
      return `rgba(${props.color}, 0.18)`;
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
    if (props.isBuffer && isEmpty) return '0px solid transparent';
    if (props.type === 'ghost') return '1px dashed rgba(0,0,0,0.35)';
    if (props.type === 'garbage') return '2px solid rgba(60, 60, 60, 0.8)';
    if (isEmpty) return '0px solid transparent';
    return '2px solid rgba(0, 0, 0, 0.4)'; // Darker border for textured blocks
  }};
  border-color: ${(props) => {
    const isEmpty = props.type === 0 || props.type === '0';
    if (isEmpty) return 'transparent';
    if (props.type === 'ghost') return 'rgba(0,0,0,0.35)';
    if (props.type === 'garbage') return 'rgba(60, 60, 60, 0.8)';
    return 'rgba(0, 0, 0, 0.4)';
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