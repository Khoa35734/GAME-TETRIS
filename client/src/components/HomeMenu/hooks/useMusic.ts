import { useEffect, useRef, useState } from 'react';

export function useMusic() {
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  useEffect(() => {
    if (!bgMusicRef.current) {
      const audio = new Audio('/sound/bg.mp3');
      audio.loop = true;
      audio.volume = 0.3;
      bgMusicRef.current = audio;
    }

    const playMusic = async () => {
      try {
        await bgMusicRef.current?.play();
        setIsMusicPlaying(true);
      } catch (error) {
        const startMusic = async () => {
          try {
            await bgMusicRef.current?.play();
            setIsMusicPlaying(true);
            document.removeEventListener('click', startMusic);
          } catch (e) {
            console.error('Failed to play music:', e);
          }
        };
        document.addEventListener('click', startMusic, { once: true });
      }
    };

    playMusic();

    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current.currentTime = 0;
      }
    };
  }, []);

  const toggleMusic = () => {
    if (bgMusicRef.current) {
      if (isMusicPlaying) {
        bgMusicRef.current.pause();
        setIsMusicPlaying(false);
      } else {
        bgMusicRef.current.play();
        setIsMusicPlaying(true);
      }
    }
  };

  return { isMusicPlaying, toggleMusic, bgMusicRef };
}

