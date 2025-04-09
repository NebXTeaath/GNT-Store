// src/pages/repairPage/NewRequestWrapper.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import NewRequest from './NewRequest';

const NewRequestWrapper: React.FC = () => {
  const navigate = useNavigate();
  
  const handleSuccessfulSubmission = () => {
    // Navigate to repair history page after successful submission
    navigate("/repair/history");
  };
  
  return <NewRequest onSuccessfulSubmission={handleSuccessfulSubmission} />;
};

export default NewRequestWrapper;