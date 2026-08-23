import { UploadOutlined } from '@ant-design/icons'
import { Button, Checkbox } from 'antd'
import React, { Component } from 'react'

// @ts-ignore 老版 tui-editor 打包产物无类型声明
import Editor from '@common/tui-editor/dist/tui-editor-Editor-all.min.js'
import '@common/tui-editor/dist/tui-editor.min.css' // editor ui
import '@common/tui-editor/dist/tui-editor-contents.min.css' // editor content

type PropTypes = {
  isConflict: boolean
  onUpload: (desc: string, markdown: string) => void
  onCancel: () => void
  notice: boolean
  onEmailNotice: (e: any) => void
  desc?: string
}

class WikiEditor extends Component<PropTypes> {
  editor: any

  componentDidMount() {
    this.editor = new Editor({
      el: document.querySelector('#desc'),
      initialEditType: 'wysiwyg',
      height: '500px',
      initialValue: this.props.desc,
    })
  }

  onUpload = () => {
    const desc = this.editor.getHtml()
    const markdown = this.editor.getMarkdown()
    this.props.onUpload(desc, markdown)
  }

  render() {
    const { isConflict, onCancel, notice, onEmailNotice } = this.props
    return (
      <div>
        <div
          id="desc"
          className="wiki-editor"
          style={{ display: !isConflict ? 'block' : 'none' }}
        />
        <div className="wiki-title wiki-up">
          <Button
            icon={<UploadOutlined />}
            type="primary"
            className="upload-btn"
            disabled={isConflict}
            onClick={this.onUpload}
          >
            更新
          </Button>
          <Button onClick={onCancel} className="upload-btn">
            取消
          </Button>
          <Checkbox checked={notice} onChange={onEmailNotice}>
            通知相关人员
          </Checkbox>
        </div>
      </div>
    )
  }
}

export default WikiEditor
