import React, {Component} from 'react';
import { TextField, Snackbar, CircularProgress} from '@material-ui/core'
import './App.css';
import axios from 'axios';
const moment = require('moment-timezone')
const sanitizer = require('sanitizer')

const apiURL = "http://localhost:8080"
const s3URL = "https://afypsw2lwf.execute-api.ap-southeast-1.amazonaws.com/demo"
const instance = axios.create({
  baseURL: apiURL,
  timeout: 3000
})

const apiGWAxios = axios.create({
  baseURL: s3URL,
  timeout: 3000
})

class App extends Component {
  state = {
    messages: [],
    svc2msg: "",
    text: "",
    openSnackBar: false,
    msgStatus: "",
    txtErrorMsg: "",
    fileToUpload: undefined,
    uploading: false
  }

  componentDidMount() {
    instance.get('/messages')
    .then(res => {
      this.setState({
        messages: res.data.data
      })
    })
  }

  refreshTable = () => {
    instance.get('/messages')
    .then(res => {
      this.setState({
        messages: res.data.data
      })
    })
  }

  handleSnackbarClose = event => {
    this.setState({
      openSnackBar: false,
      msgStatus: ""
    })
  }

  handleChange = event => this.setState({
    text: event.target.value,
    txtErrorMsg: ""
  })

  handleBrowse = event => {
    this.setState({
      fileToUpload: event.target.files[0]
    })
  }

  handleInvoke = event => {
    instance.get('/svc-2')
    .then(res => {
      this.setState({
        svc2msg: res.data.message
      })
    })
    .catch(err => {
      this.setState({
        svc2msg: "Error! Could not reach to the other Service."
      })
    })
  }

  handleSubmit = event => {
    if (this.state.text) {
      instance.post('/messages', {
        'created_at': moment().format("YYYY-MM-DD HH:mm:SS"),
        'message': sanitizer.escape(this.state.text)
      }).then(res => {
        this.setState({
          openSnackBar: true,
          msgStatus: "Message is successfully submitted",
          text: ""
        });
        this.refreshTable()
      }).catch(err => {
        this.setState({
          openSnackBar: true,
          msgStatus: "Message submission failed",
          text: ""
        })
      })
    } else {
      this.setState({
        txtErrorMsg: "Message is required"
      });
    }
  }

  handleUpload = event => {
    if (!this.state.fileToUpload) {
      this.setState({
        openSnackBar: true,
        msgStatus: "Empty file. Choose a file to upload.",
      });
      return
    }

    if (this.state.fileToUpload.size / 1000000 >= 1) {
      this.setState({
        openSnackBar: true,
        msgStatus: "Error. File must be below 1MB.",
      });
      return
    }
    
    apiGWAxios.get('/s3-presigned-url?fileName=' + this.state.fileToUpload.name)
    .then(res => {
      axios({
        method: "PUT",
        url: res.data.fileUploadURL,
        data: this.state.fileToUpload,
        headers: {"Content-Type": "multipart/form-data"}
      }).then(res => {
        this.setState({
          openSnackBar: true,
          msgStatus: "Uploading the file...",
          fileToUpload: undefined,
          uploading: true
        });

        setTimeout(() => { 
          this.setState({
            uploading: false,
            msgStatus: "Successfully uploaded the file.",
          }) 
          this.refreshTable()
        }, 2000)

      }).catch(err => {
        this.setState({
          openSnackBar: true,
          msgStatus: "Error uploading file. Try again",
        });
      })
    })
    .catch(err => {
      this.setState({
        openSnackBar: true,
        msgStatus: "Error getting pre-signed URL. Try again",
      });
    })
   
  }

  render() {
    return (
      <div className="App">
        <h2>AWS Demo</h2>
        <div className="cus-container"> 
          <div>
            <h5>Invoke service in the peered VPC</h5>
            <button onClick={this.handleInvoke} type="button" className="btn-invoke btn btn-outline-primary">Invoke</button>
            <p>Msg from the other Service: <b>{this.state.svc2msg}</b></p>
          </div>
          <hr/>
          <div>
            <h5>Enter your message and submit or Upload a file to S3</h5>
            <p>Your submitted messages will be saved in the database. <br/> Uploaded files will be stored in S3 and the URLs will be stored in the database.</p>            
            <TextField 
              error={this.state.txtErrorMsg === "Message is required"}
              className="txt-field" 
              variant="outlined" 
              id="outlined-basic" 
              helperText={this.state.txtErrorMsg}
              label="Enter your message" 
              value={this.state.text}
              onChange={this.handleChange}
            />
            <button onClick={this.handleSubmit} type="button" className="btn-submit btn btn-outline-primary">Submit</button>
            
            <div className="input-group mb-3 file-upload-gp ">
              <div className="custom-file">
                <input onChange={this.handleBrowse} type="file" className="custom-file-input" id="inputGroupFile02" />
                <label className="custom-file-label" htmlFor="inputGroupFile02" aria-describedby="inputGroupFileAddon02">
                  {
                    (this.state.fileToUpload) ? this.state.fileToUpload.name: "Choose file"
                  }
                </label>
              </div>
              <div className="input-group-append">
                <button onClick={this.handleUpload} type="button" className="btn btn-outline-secondary">Upload</button>
              </div>
            </div>
            <div className="loading-icon">
              {
                this.state.uploading && <CircularProgress/>
              }
            </div>
            <p className="table-msg">The following table displays items from DynamoDB.</p>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Timestamp</th>
                  <th scope="col">Messages/URL</th>
                </tr>
              </thead>
              <tbody>
                {
                  this.state.messages.map((msg, i) => 
                    <tr key={i}>
                      <td className="t-col-1">{msg.created_at.S}</td>
                      <td>
                        {
                        (msg.message.S.includes('http')) 
                        ? <a href={msg.message.S}>{msg.message.S}</a>
                        : <span>{msg.message.S}</span>
                        }
                        
                        </td>
                    </tr>
                  )
                }
              </tbody>
            </table>
            <Snackbar 
              open={this.state.openSnackBar} 
              autoHideDuration={5000} 
              onClose={this.handleSnackbarClose}
              message={this.state.msgStatus}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default App;
