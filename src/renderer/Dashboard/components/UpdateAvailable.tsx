import { Modal } from 'antd';

interface UpdateAvailableProps {
  visible: boolean;
  version: string;
  releaseNotesHtml: string;
  acceptText?: string;
  onAccept: () => void;
  onDecline: () => void;
}

function UpdateAvailable({
  visible,
  version,
  releaseNotesHtml,
  acceptText = '现在更新',
  onAccept,
  onDecline,
}: Readonly<UpdateAvailableProps>) {
  return (
    <Modal
      title={`发现新版本 ${version}`}
      open={visible}
      onOk={onAccept}
      onCancel={onDecline}
      okText={acceptText}
      cancelText="暂不更新"
      mask={{ closable: false }}
      destroyOnHidden
      centered
      zIndex={10000}
      getContainer={() => document.body}
      width={560}
      styles={{
        body: { height: 360, paddingTop: 12, overflow: 'hidden' },
      }}
    >
      <div
        className="update-release-notes"
        // 更新说明来自本仓库 Release，需渲染 HTML（原生 dialog 不支持）
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: releaseNotesHtml || '<p>暂无更新说明</p>',
        }}
      />
      <style>{`
        .update-release-notes {
          width: 100%;
          height: 100%;
          overflow: auto;
          line-height: 1.6;
          word-break: break-word;
          box-sizing: border-box;
        }
        .update-release-notes h1,
        .update-release-notes h2,
        .update-release-notes h3,
        .update-release-notes h4 {
          margin: 0.75em 0 0.35em;
          font-size: 14px;
          font-weight: 600;
        }
        .update-release-notes p { margin: 0.4em 0; }
        .update-release-notes ul,
        .update-release-notes ol { padding-left: 1.4em; margin: 0.4em 0; }
        .update-release-notes a { color: #1677ff; }
        .update-release-notes img { max-width: 100%; height: auto; }
        .update-release-notes code {
          padding: 0 4px;
          background: rgba(0, 0, 0, 0.06);
          border-radius: 3px;
          font-size: 12px;
        }
        .update-release-notes pre {
          padding: 8px;
          overflow: auto;
          background: rgba(0, 0, 0, 0.06);
          border-radius: 4px;
        }
      `}</style>
    </Modal>
  );
}

export default UpdateAvailable;
