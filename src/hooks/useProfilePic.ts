import { useState, useEffect } from 'react';
import { uploadProfilePicture } from '../lib/db';

export const useProfilePic = (userId: string | undefined, userName: string) => {
  const [profilePic, setProfilePic] = useState<string | null>(() => {
    if (!userId) return null;
    const savedPic = localStorage.getItem(`profile_pic_${userId}`);
    return (savedPic && savedPic !== 'null' && savedPic !== 'undefined') ? savedPic : null;
  });
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    if (!userId) {
      setProfilePic(null);
      return;
    }
    
    // Ensure state is updated if userId changes dynamically
    const savedPic = localStorage.getItem(`profile_pic_${userId}`);
    if (savedPic && savedPic !== 'null' && savedPic !== 'undefined') {
      setProfilePic(savedPic);
    } else {
      setProfilePic(null);
    }

    // Handle global updates
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      setProfilePic(customEvent.detail);
    };

    const eventName = `profilePicUpdated_${userId}`;
    window.addEventListener(eventName, handleUpdate);
    
    return () => {
      window.removeEventListener(eventName, handleUpdate);
    };
  }, [userId]);

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!userId) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPic(true);
      const url = await uploadProfilePicture(file, userName, profilePic);
      setProfilePic(url);
      localStorage.setItem(`profile_pic_${userId}`, url);
      // Broadcast to other components
      window.dispatchEvent(new CustomEvent(`profilePicUpdated_${userId}`, { detail: url }));
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Gagal mengunggah foto profil. Silakan coba lagi.');
    } finally {
      setIsUploadingPic(false);
    }
  };

  return {
    profilePic,
    isUploadingPic,
    isProfileOpen,
    setIsProfileOpen,
    handleProfilePicChange
  };
};
