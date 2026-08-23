import { EditOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import React from 'react'
import { Link } from 'react-router-dom'

type PropTypes = {
  editorEable: boolean
  onEditor: () => void
  uid?: number
  username?: string
  editorTime?: string
  desc?: string
}

const WikiView = (props: PropTypes) => {
  const { editorEable, onEditor, uid, username, editorTime, desc } = props
  return (
    <div className="wiki-view-content">
      <div className="wiki-title">
        <Button icon={<EditOutlined />} onClick={onEditor} disabled={!editorEable}>
          编辑
        </Button>
        {username && (
          <div className="wiki-user">
            由{' '}
            <Link className="user-name" to={`/user/profile/${uid || 11}`}>
              {username}
            </Link>{' '}
            修改于 {editorTime}
          </div>
        )}
      </div>
      <div
        className="tui-editor-contents"
        dangerouslySetInnerHTML={{ __html: desc }}
      />
    </div>
  )
}

export default WikiView
