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

function UpdateProgress({ visible, progress, status }: UpdateProgressProps) {
  return (
    <Modal title="下载更新" open={visible} footer={null} closable={false}>
      <Progress percent={progress} status="active" />
      <div style={{ marginTop: 10 }}>
        已下载: {(status.transferred / 1024 / 1024).toFixed(2)} MB / 总大小:{' '}
        {(status.total / 1024 / 1024).toFixed(2)} MB
        <br />
        下载速度: {(status.bytesPerSecond / 1024 / 1024).toFixed(
          2,
        )} MB/s
      </div>
    </Modal>
  );
}

export default UpdateProgress;
