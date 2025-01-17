import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Button, Divider, Input, List, Popover } from 'antd';
import type { InputRef } from 'antd';
import clsx from 'clsx';
import { useSetAtom } from 'jotai';
import { DownloadIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { downloadImage, statusImage, imageEnabled } from '@/api/download.ts';
import { isKeyboardEnableAtom } from '@/jotai/keyboard.ts';

export const DownloadImage = () => {
  const { t } = useTranslation();
  const setIsKeyboardEnable = useSetAtom(isKeyboardEnableAtom);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const [input, setInput] = useState('');
  const [status, setStatus] = useState('');
  const [log, setLog] = useState('');
  const [diskEnabled, setDiskEnabled] = useState(false);
  const [popoverKey, setPopoverKey] = useState(0);


  const inputRef = useRef<InputRef>(null);

  const intervalId = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
    checkDiskEnabled();
  }, []);

  function checkDiskEnabled() {
    imageEnabled()
      .then((res) => {
        console.log(res.enabled);
        setDiskEnabled(res.enabled);
      })
      .catch((err) => {
        setDiskEnabled(false);
      });
  }
  function handleOpenChange(open: boolean) {
    if (open) {
      clearInterval(intervalId);
      checkDiskEnabled();
      getDownloadStatus();
      if (!intervalId.current) {
        intervalId.current = setInterval(getDownloadStatus, 2500);
      };
      setIsKeyboardEnable(false);
      setPopoverKey(prevKey => prevKey + 1); // Force re-render
    } else {
      setInput('');
      setStatus('');
      setLog('');

      setIsKeyboardEnable(true);
      clearInterval(intervalId.current);
      intervalId.current = undefined;
    }

    setIsPopoverOpen(open);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
  }

  function getDownloadStatus() {
    statusImage().then((rsp) => {
      if (rsp.status) {
        setStatus(rsp.status);
        if (rsp.status === 'in_progress') {
          // Check if rsp has a percentage value
          if (rsp.percentage) {
            setLog('Downloading ('+ rsp.percentage + ')' + ': ' + rsp.file);
          } else {
            setLog('Downloading' + ': ' + rsp.file);
          }
          setInput(rsp.file);
        };
        if (rsp.status === 'failed') {
          setLog('Failed');
          clearInterval(intervalId.current);
        };
        if (rsp.status === 'idle') {
        setLog(''); // Clear the log
        clearInterval(intervalId.current);
        };
      };
    });
  };

  function download(url?: string) {
    setStatus('in_progress');
    setLog('Downloading: ' + url);
    // start the getDownloadStatus to tick every 5 seconds

    downloadImage(url).then((rsp) => {
      getDownloadStatus();
      // Start the interval to check the download status
      if (!intervalId.current) {
        intervalId.current = setInterval(getDownloadStatus, 2500);}
    }).catch((err) => {
      clearInterval(intervalId.current); // Clear the interval when the download is complete or fails
      setStatus('failed');
      setLog('Failed');
    });
  }

  const content = (
    <div className="min-w-[300px]">
      <div className="flex items-center justify-between px-1">
        <span className="text-base font-bold text-neutral-300">{t('download.download')}</span>
      </div>

      <Divider style={{ margin: '10px 0 10px 0' }} />

      {!diskEnabled ? (
        <div className="text-red-500">{t('download.disabled')}</div>
      ) : (
        <>
          <div className="pb-1 text-neutral-500">{t('download.input')}</div>
          <div className="flex items-center space-x-1">
            <Input ref={inputRef} value={input} onChange={handleChange} disabled={status === 'in_progress'} />
            <Button type="primary" onClick={() => download(input)} disabled={status === 'in_progress'}>
              {t('download.ok')}
            </Button>
          </div>
        </>
      )}
      <div className={clsx('py-2')}>
        {status && (
          <div
            className={clsx(
              'max-w-[300px] break-words text-sm',
              status === 'failed' ? 'text-red-500' : 'text-green-500'
            )}
          >
            {log}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Popover
      key={popoverKey}
      content={content}
      placement="bottomLeft"
      trigger="click"
      open={isPopoverOpen}
      onOpenChange={handleOpenChange}
    >
      <div className="flex h-[30px] cursor-pointer items-center justify-center rounded px-2 text-neutral-300 hover:bg-neutral-700">
        <DownloadIcon size={18} />
      </div>
    </Popover>
  );
};
