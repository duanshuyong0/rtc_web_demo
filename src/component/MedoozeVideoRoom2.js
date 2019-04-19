import React, {Component} from "react";
import CssBaseline from "@material-ui/core/CssBaseline";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import IconButton from "@material-ui/core/IconButton";
import {AudioIcon, AudioOffIcon, VideoIcon, VideoOffIcon} from "../img/svgIcons";
import NativeSelect from "@material-ui/core/NativeSelect";
import { withStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import PropTypes from 'prop-types';

import TransactionManager from "../lib/TransactionManager";   //'transaction-manager'
import MediaServerClient from "../lib/MediaServerClient";
import Background from '../img/bkgrd.jpg';
//import TransactionManager from '../lib/transaction-manager'
let participants;
let pc;
let joined=false;
var index=0;
let poster_addr='https://timgsa.baidu.com/timg?image&quality=80&size=b9999_10000&sec=1554783370112&di=b8e3916534a569ab6c13fcc8b01e9e32&imgtype=0&src=http%3A%2F%2Fimg.17xsj.com%2Fuploads%2Fallimg%2Fc121126%2F1353910E4M0-52Kb.jpg';

class MedoozeVideoRoom2 extends Component {

    constructor(props){
        super(props);
        this.state={
            localVideoSrc:null,
            videoEnable:true,
            audioEnable:true,
            bitrateValue:100,
            bStartEchoTestButton:false,
            videoSrcs: new Map(),
        };

        // create a ref to store the video DOM element
        this.OldvideoSrcs=new Map();
        this.localVideo = React.createRef();
        this.remoteVideo=React.createRef();

        //Get our url
        this.roomId = "1234";
        var myDate = new Date();
        myDate.toLocaleString();
        this.name = myDate.toLocaleString();
        this.nopublish = false;
        //this.pc=null;
        this.url="wss://47.94.235.90:8083";
        this.localStreamID="";
        this.remoteIndex=-1;

        this.handleStart=this.handleStart.bind(this);
        this.handleVideoOn=this.handleVideoOn.bind(this);
        this.handleAudioOn=this.handleAudioOn.bind(this);

        this.connect=this.connect.bind(this);
        this.addRemoteTrack=this.addRemoteTrack.bind(this);
        this.removeRemoteTrack=this.removeRemoteTrack.bind(this);
    }

    componentDidMount() {

    }

    componentWillUnmount(){

    }

    componentDidUpdate(prevProps, prevState) {

    }

    handleVideoOn(){

    }

    handleAudioOn(){

    }

    handleSelectChange = name => event => {

    };

    handleStart(){
        this.connect(this.url, this.roomId, this.name)
    }

    addRemoteTrack(event){
        console.log("addRemoteTrack:"+event);
        const track	= event.track;
        const stream	= event.streams[0];
        if (!stream)
            return console.log("addRemoteTrack() no stream")
        //添加到map中
        //如果map里面已经有了这个stream,则直接返回
        if(this.state.videoSrcs.has(stream.id)){
            return;
        }
        var videoRef=React.createRef();
        //this.OldvideoSrcs.set(stream.id,videoRef);
        //TODO react ask for deep copy!May be new edition has better soluation
        //var mapVideoSrcs=new Map();
        //this.OldvideoSrcs.forEach((value,key,map)=>{
         //   mapVideoSrcs.set(key,value);
        //});

        stream.oninactive = (event)=>console.log(event);

        console.log("before set state:"+videoRef.current);
        this.setState(function(prevState, props) {
            prevState.videoSrcs.set(stream.id, videoRef);
            //prevState.videoSrcs.delete('foo');
            return {
                videoSrcs: prevState.videoSrcs
            }
        },function(){
            videoRef.current.srcObject=stream;
            console.log("after set state:"+videoRef.current);
        });

        //this.setState({videoSrcs:mapVideoSrcs},() => {
            //console.log("after set state:"+videoRef.current);
            //videoRef.current.srcObject=stream;
            //videoRef.current.id=stream.id;
       // });


    }

    removeRemoteTrack(event){
        console.log("removeRemoteTrack:"+event);
    }

    connect(url,roomId,name)
    {
        var that=this;
        //Connect with websocket
        //Create room url
        const roomUrl = url +"?id="+roomId;
        const ws = new WebSocket(roomUrl,"unified-plan");
        //Crete transaction manager
        const tm = new TransactionManager(ws);
        //create managed peer connection
        const client=new MediaServerClient(tm);  
        //myPeerConnection.onicecandidate = handleICECandidateEvent;
        //myPeerConnection.onremovetrack = handleRemoveTrackEvent;
        //myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
        //myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
        //myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
        ws.onopen = async function()
        {
            console.log("ws:opened");
            //create new managed pc
            pc=await client.createManagedPeerConnection();

            //on new remote tracks
            pc.ontrack=that.addRemoteTrack;
            pc.ontrackended=that.removeRemoteTrack;
            //add local camera and mic media          
            try
            {
                    const constraints={
                        audio: true,
                        video: true
                    };
                     //let stream = null;
                     try {
                         const stream = await navigator.mediaDevices.getUserMedia(constraints);
                        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

                         //Play it
                         that.localStreamID=stream.id;
                         that.localVideo.current.srcObject=stream;
                         that.localVideo.current.id=stream.id;
                     } catch(err) {
                         console.log(err.toString());
                    }
            } catch (error) {
                console.error("Error",error);
                ws.close();
            }


            /*这里暂时没用*/
            tm.on("event",async function(event) {
                return;
                console.warn("ts::event",event);

                switch (event.name)
                {
                    case "update" :
                        try
                        {
                            console.warn("update"+event.data.sdp);

                            //Create new offer
                            const offer = new RTCSessionDescription({
                                type : 'offer',
                                sdp  : event.data.sdp
                            });

                            //update participant list
                            participants = event.participants;

                            //Set offer
                            await pc.setRemoteDescription(offer);

                            console.log("pc::setRemoteDescription succes",offer.sdp);
                            //此处根据participants数量来添加对应数量的transceiver
                            for(let i=0;i<that.remoteVideos;i++){
                                pc.addTransceiver("audio",{direction: "recvonly"});
                                pc.addTransceiver("video",{direction: "recvonly"});
                            }

                            //Create answer
                            const answer = await pc.createAnswer();

                            console.log("pc::createAnswer succes",answer.sdp);

                            //Only set it locally
                            await pc.setLocalDescription(answer);

                            console.log("pc::setLocalDescription succes",answer.sdp);

                        } catch (error) {
                            console.error("Error",error);
                            ws.close();
                        }
                        break;
                    case "participants" :
                        //update participant list
                        console.warn("participants"+event.participants);
                        participants = event.participants;
                        break;
                }
            });

        };


    }

    render() {
        const { classes } = this.props;
        return (
            <div className={classes.root}>
            <Grid container className={classes.container} spacing={1}>
                <Grid item xs={6}>
                    <header >
                        <h1 className="App-title">Medooze Video Room</h1>
                    </header>
                </Grid>
                <Grid item xs={6}>
                    <Button color="primary" variant="contained" onClick={this.handleStart}>
                        {this.state.bStartEchoTestButton?'stop':'start'}
                    </Button>
                </Grid>

                <Grid item xs={4}>
                    <video className={classes.videoLarge}
                           ref={this.localVideo}
                           id="localVideo"
                           poster={poster_addr}
                           autoPlay="true"/>
                </Grid>
                {[...this.state.videoSrcs].map(([key,value])=>{
                    <Grid item xs={4} zeroMinWidth>
                    <video className={classes.videoSmall}
                    ref={value}
                    id={key}
                    poster={poster_addr}
                    autoPlay="true"/>
                    </Grid>})
                }

                {/* {this.state.videoSrcs.forEach((value,key,map) => (
                        <Grid item xs={4} zeroMinWidth>
                            <video className={classes.videoSmall}
                                   ref={value}
                                   id={key}
                                   poster={poster_addr}
                                   autoPlay="true"/>
                        </Grid>
                    ))}*/}
            </Grid>
            </div>
        );
    }
}

const styles = theme => ({
    root: {
        flexGrow: 1,
        padding: 20,
        //backgroundImage: `url(${Background})`,
        height: '100%',
    },
    container: {
        direction: 'row',
        justify: "center",
        alignItems: 'center',
    },
    gridLayout:{
        justify: "center",
        alignItems: "center",
    },
    videoLarge: {
        paddingTop: 1, // 16:9
        width:'98%',
        height:'95%',
    },
    videoSmall: {
        paddingTop: 1, // 16:9
        width:'98%',
        height:'95%',
        alignItems:"flex-start",
    },
    paper: {
        padding: theme.spacing.unit * 2,
        textAlign: 'center',
        height: '1800',
        color: theme.palette.text.secondary,
    },
});

MedoozeVideoRoom2.propTypes = {
    classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(MedoozeVideoRoom2);




