import { Modal, Progress } from 'antd';

interface UpdateProgressProps {
  visible: boolean;
  progress: number;
  status: {
    transferred: number;
    total: number;
    bytesPerSecond: number;
  };
}

function formatMb(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0.00';
  return (bytes / 1024 / 1024).toFixed(2);
}

function UpdateProgress({
  visible,
  progress,
  status,
}: Readonly<UpdateProgressProps>) {
  const percent = Number.isFinite(progress)
    ? Math.min(100, Math.max(0, Math.floor(progress)))
    : 0;

  return (
    <Modal
      title="下载更新"
      open={visible}
      footer={null}
      closable={false}
      mask={{ closable: false }}
      destroyOnHidden
      zIndex={10000}
      getContainer={() => document.body}
    >
      <Progress percent={percent} status="active" />
      <div style={{ marginTop: 10 }}>
        已下载: {formatMb(status.transferred)} MB / 总大小:{' '}
        {formatMb(status.total)} MB
        <br />
        下载速度: {formatMb(status.bytesPerSecond)} MB/s
      </div>
    </Modal>
  );
}

export default UpdateProgress;
