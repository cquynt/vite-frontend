import { useState } from 'react'
import type { useGitHub } from './useGitHub'

interface SourceControlPanelProps {
  github: ReturnType<typeof useGitHub>
  onOpen: (path: string) => void
}

const formatDate = (iso: string) => new Date(iso).toLocaleString()

export function SourceControlPanel({ github, onOpen }: SourceControlPanelProps) {
  const [message, setMessage] = useState('')
  const [confirmPull, setConfirmPull] = useState(false)
  const { connection, changes, commits, busy } = github

  const handlePull = () => {
    if (changes.length > 0 && !confirmPull) {
      setConfirmPull(true)
      return
    }
    setConfirmPull(false)
    github.pull()
  }

  const handleCommit = async () => {
    if (await github.commit(message.trim())) {
      setMessage('')
    }
  }

  return (
    <div className="scm">
      <div className="explorer-header">
        <span>SOURCE CONTROL</span>
      </div>
      {!connection && (
        <div className="scm-form">
          <input
            placeholder="owner/repo or GitHub URL"
            value={github.repoInput}
            onChange={(event) => github.setRepoInput(event.target.value)}
          />
          <input
            placeholder="branch"
            value={github.branch}
            onChange={(event) => github.setBranch(event.target.value)}
          />
          <input
            type="password"
            placeholder="Personal access token (needed to push)"
            value={github.token}
            onChange={(event) => github.setToken(event.target.value)}
          />
          <button type="button" className="primary" disabled={!!busy || !github.repoInput} onClick={github.connect}>
            Connect
          </button>
          <p className="scm-hint">
            Fine-grained token with Contents: read and write on the repository. It is kept in this tab only.
          </p>
        </div>
      )}
      {connection && (
        <>
          <div className="scm-repo">
            <span>
              {connection.ref.owner}/{connection.ref.repo} @ {connection.ref.branch}
            </span>
            <button type="button" onClick={github.disconnect}>
              Disconnect
            </button>
          </div>
          <div className="scm-form">
            <textarea
              rows={2}
              placeholder="Commit message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <button
              type="button"
              className="primary"
              disabled={!!busy || changes.length === 0 || !message.trim()}
              onClick={handleCommit}
            >
              Commit &amp; Push
            </button>
            <button type="button" disabled={!!busy} onClick={handlePull}>
              {confirmPull ? `Discard ${changes.length} changes and pull` : 'Pull'}
            </button>
          </div>
          <div className="scm-section">CHANGES ({changes.length})</div>
          <div className="scm-list">
            {changes.map((change) => (
              <div role="button"
                key={change.path}
                className="tree-row"
                onClick={() => change.status !== 'D' && onOpen(change.path)}
              >
                <span className="tree-name">{change.path}</span>
                <span className={`tree-status status-${change.status}`}>{change.status}</span>
              </div>
            ))}
          </div>
          <div className="scm-section">HISTORY</div>
          <div className="scm-list history">
            {commits.map((commit) => (
              <div key={commit.sha} className="commit">
                <div className="commit-message">{commit.message.split('\n')[0]}</div>
                <div className="commit-meta">
                  {commit.sha.slice(0, 7)} · {commit.author} · {formatDate(commit.date)}
                </div>
                <button type="button" disabled={!!busy} onClick={() => github.restore(commit.sha)}>
                  Restore
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {busy && <p className="scm-status">{busy}</p>}
      {github.info && <p className="scm-status">{github.info}</p>}
      {github.error && <p className="error-block">{github.error}</p>}
    </div>
  )
}
