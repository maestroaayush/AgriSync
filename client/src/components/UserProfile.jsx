import React, { useState } from 'react';
import axios from 'axios';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function UserProfile({ user }) {
  const [profilePhoto, setProfilePhoto] = useState(user.profilePhoto || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [location, setLocation] = useState(user.location.address || '');

  const handleProfileUpdate = async () => {
    try {
      const formData = new FormData();
      formData.append('profilePhoto', profilePhoto);
      formData.append('currentPassword', currentPassword);
      formData.append('newPassword', newPassword);
      
      if (user.role === 'admin') {
        formData.append('location', location);
      }

      await axios.put(`http://localhost:5000/api/users/${user._id}/profile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again later.');
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-semibold mb-4">Update Profile</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
        <input type="file" onChange={e => setProfilePhoto(e.target.files[0])} className="mt-1" />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Current Password</label>
        <input
          type="password"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
        />
      </div>

      {user.role === 'admin' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Location</label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
          />
        </div>
      )}

      <button
        onClick={handleProfileUpdate}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        Update Profile
      </button>
    </div>
  );
}

export default UserProfile;

