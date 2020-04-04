import React, {Component} from 'react';
import { TextField, Snackbar, CircularProgress, Fab } from '@material-ui/core'
import RefreshIcon from '@material-ui/icons/Refresh';
import './App.css';
import axios from 'axios';
const moment = require('moment-timezone')
const sanitizer = require('sanitizer')

const apiURL = "https://afypsw2lwf.execute-api.ap-southeast-1.amazonaws.com/demo"

const instance = axios.create({
  baseURL: apiURL,
  timeout: 3000
})

class App extends Component {
  state = {
    messages: [],
    svc2msg: "",
    text: "",
    openSnackBar: false,
    snackBarMsg: "",
    txtErrorMsg: "",
    fileToUpload: undefined,
    uploading: false,
    token: "",
    tokenErrorMsg: ""
  }

  refreshTable = event => {
    instance.get('/messages', {
      headers: {
        "token": this.state.token
      }
    })
    .then(res => {
      this.setState({
        messages: res.data.data
      })
    })
    .catch(err => {
      this.setState({
        messages: [],
        snackBarMsg: "Error fetching table data. " + err.message,
        openSnackBar: true,
      })
    })
  }

  handleSnackbarClose = event => {
    this.setState({
      openSnackBar: false,
      snackBarMsg: ""
    })
  }

  handleChange = event => this.setState({
    text: event.target.value,
    txtErrorMsg: ""
  })

  handleTokenChange = event => this.setState({
    token: event.target.value,
    tokenErrorMsg: ""
  })

  handleBrowse = event => {
    this.setState({
      fileToUpload: event.target.files[0]
    })
  }

  handleInvoke = event => {
    instance.get('/svc-2', {
      headers: {
        "token": this.state.token
      }
    })
    .then(res => {
      this.setState({
        svc2msg: res.data.message
      })
    })
    .catch(err => {
      this.setState({
        svc2msg: "Error! Could not reach to the other Service. " + err.message
      })
    })
  }

  handleSave = event => {
    this.refreshTable()
  }

  handleSubmit = event => {
    if (this.state.text) {
      instance.post('/messages', {
        'created_at': moment().format("YYYY-MM-DD HH:mm:SS"),
        'message': sanitizer.escape(this.state.text)
      }, {
        headers: {
          "token": this.state.token
        },
      }).then(res => {
        this.setState({
          openSnackBar: true,
          snackBarMsg: "Message is successfully submitted",
          text: ""
        });
        this.refreshTable()
      }).catch(err => {
        this.setState({
          openSnackBar: true,
          snackBarMsg: "Message submission failed. " + err.message,
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
        snackBarMsg: "Empty file. Choose a file to upload.",
      });
      return
    }

    if (this.state.fileToUpload.size / 1000000 >= 1) {
      this.setState({
        openSnackBar: true,
        snackBarMsg: "Error. File must be below 1MB.",
      });
      return
    }
    
    instance.get('/s3-presigned-url?fileName=' + this.state.fileToUpload.name, {
      headers: {
        "token": this.state.token
      }
    })
    .then(res => {
      axios({
        method: "PUT",
        url: res.data.fileUploadURL,
        data: this.state.fileToUpload,
        headers: {"Content-Type": "multipart/form-data"}
      }).then(res => {
        this.setState({
          openSnackBar: true,
          snackBarMsg: "Uploading the file...",
          fileToUpload: undefined,
          uploading: true
        });

        setTimeout(() => { 
          this.setState({
            uploading: false,
            snackBarMsg: "Successfully uploaded the file.",
          }) 
          this.refreshTable()
        }, 2000)

      }).catch(err => {
        this.setState({
          openSnackBar: true,
          snackBarMsg: "Error uploading file. Try again",
        });
      })
    })
    .catch(err => {
      this.setState({
        openSnackBar: true,
        snackBarMsg: "Error getting pre-signed URL. " + err.message,
      });
    })
   
  }

  render() {
    return (
      <div className="App">
        <h2>AWS Demo</h2>
        <div className="cus-container"> 
          <div>
          <p>Enter the token provided, otherwise buttons will be disabled and the app will not work.</p>
          <TextField 
              error={this.state.tokenErrorMsg === "Token is required"}
              className="txt-field" 
              variant="outlined" 
              id="outlined-basic" 
              helperText={this.state.tokenErrorMsg}
              label="Auth Token" 
              value={this.state.token}
              onChange={this.handleTokenChange}
            />
            <hr/>
            <h5>Invoke service in the peered VPC</h5>
            <button onClick={this.handleInvoke} disabled={this.state.token === ""} type="button" className="btn-invoke btn btn-outline-primary">Invoke</button>
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
            <button onClick={this.handleSubmit}  disabled={this.state.token === ""} type="button" className="btn-submit btn btn-outline-primary">Submit</button>
            
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
                <button onClick={this.handleUpload} disabled={this.state.token === ""} type="button" className="btn btn-outline-secondary">Upload</button>
              </div>
            </div>
            <div className="loading-icon">
              {
                this.state.uploading && <CircularProgress/>
              }
            </div>
            <p className="table-msg">The following table displays items from DynamoDB.</p>
            <Fab  disabled={this.state.token === ""} size="small" color="secondary" variant="extended" onClick={this.refreshTable}>
              <RefreshIcon/>
              Refresh
            </Fab>
            <table className="table cus-table">
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
              message={this.state.snackBarMsg}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default App;
