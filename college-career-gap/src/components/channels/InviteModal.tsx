import React, { useState, useEffect } from 'react';
import { Channel } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { X, Copy, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

interface InviteModalProps {
  channel: Channel;
  onClose: () => void;
}

export function InviteModal({ channel, onClose }: InviteModalProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const inviteUrl = `${window.location.origin}/join/${channel.inviteCode}`;

  useEffect(() => {
    const generateQrCode = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(inviteUrl, {
          width: 256,
          margin: 2,
          errorCorrectionLevel: 'H',
        });
        setQrCodeDataUrl(dataUrl);
      } catch (err) {
        console.error('Failed to generate QR code', err);
        toast.error('Could not generate QR code.');
      }
    };
    generateQrCode();
  }, [inviteUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    toast.success('Invite link copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md relative transform transition-all">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto flex items-center justify-center mb-4">
            <QrCode className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Invite Students</h2>
          <p className="text-gray-600 mt-2">
            Share this link or QR code to invite students to the{' '}
            <span className="font-semibold">{channel.name}</span> channel.
          </p>
        </div>

        <div className="mt-8 text-center">
          {qrCodeDataUrl ? (
            <img
              src={qrCodeDataUrl}
              alt={`QR code for ${channel.name}`}
              className="w-48 h-48 mx-auto rounded-lg border-4 border-gray-100"
            />
          ) : (
            <div className="w-48 h-48 mx-auto bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
              <p className="text-sm text-gray-500">Generating...</p>
            </div>
          )}
        </div>

        <div className="mt-8">
          <label className="text-sm font-medium text-gray-700">Shareable Invite Link</label>
          <div className="flex items-center space-x-2 mt-2">
            <Input
              readOnly
              value={inviteUrl}
              className="bg-gray-100"
            />
            <Button variant="outline" size="md" onClick={handleCopyLink} aria-label="Copy link">
              <Copy size={18} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}