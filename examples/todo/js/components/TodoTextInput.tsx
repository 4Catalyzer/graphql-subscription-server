/**
 * This file provided by Facebook is for non-commercial testing and evaluation
 * purposes only.  Facebook reserves all rights not expressly granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * FACEBOOK BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import PropTypes from "prop-types"
import React from "react"

const ENTER_KEY_CODE = 13
const ESC_KEY_CODE = 27

const propTypes = {
    className: PropTypes.string,
    commitOnBlur: PropTypes.bool.isRequired,
    initialValue: PropTypes.string,
    onCancel: PropTypes.func,
    onDelete: PropTypes.func,
    onSave: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
}

class TodoTextInput extends React.Component {
    state = {
        text: this.props.initialValue || "",
    }

    componentDidMount() {
        this.ref.focus()
    }

    _commitChanges = () => {
        const newText = this.state.text.trim()
        if (this.props.onDelete && newText === "") {
            this.props.onDelete()
        } else if (this.props.onCancel && newText === this.props.initialValue) {
            this.props.onCancel()
        } else if (newText !== "") {
            this.props.onSave(newText)
            this.setState({text: ""})
        }
    }

    _handleBlur = () => {
        if (this.props.commitOnBlur) {
            this._commitChanges()
        }
    }

    _handleChange = e => {
        this.setState({text: e.target.value})
    }

    _handleKeyDown = e => {
        if (this.props.onCancel && e.keyCode === ESC_KEY_CODE) {
            this.props.onCancel()
        } else if (e.keyCode === ENTER_KEY_CODE) {
            this._commitChanges()
        }
    }

    render() {
        return (
            <input
                ref={r => {
                    this.ref = r
                }}
                className={this.props.className}
                onBlur={this._handleBlur}
                onChange={this._handleChange}
                onKeyDown={this._handleKeyDown}
                placeholder={this.props.placeholder}
                value={this.state.text}
            />
        )
    }
}

TodoTextInput.propTypes = propTypes

export default TodoTextInput