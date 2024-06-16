var PI = 3.14; // PI will not be accessible from outside this module

exports.Player = class {
    constructor() {
        this.clientID;
        this.key;
        this.name;
        this.team;
        this.cmd;
        this.input = "";
        this.msg = "null";
        this.frameOffset= 0;
        this.ping = 0;
        this.pingOld = 0;
        this.pingOffsetClient = 0;
        this.pingEnabled = false;
        this.frameCli = -1;
        this.socket;
    }

    pi(){
        return PI * r * r;
    }
};

exports.Match = class {
    constructor() {
        this.cmd;//current statut
        this.clientIDs;//list of client/player which are playing now
        this.cmdClient;//command received
        this.hostClientID;
        this.start = false;
        this.end = false;
        this.teamValidation = 0;
        this.teamA = 0;
        this.teamB = 0;
        this.frame = 5;
        this.frameMax = -1;
        this.frameMinCli = 0;
        this.frameOffsetMax = 5;//= intervalDelay/(1/50)
        this.timeStart;
        this.timeIntervalStart;
        this.timeIntervalEnd;
        this.version = "1.0";
        //public float intervalDelay = (float)0.1667;///(50/6)*(1/50) : 6 commandes toutes les 50 fps
        this.intervalDelay = 0.16;///(50/6.25)*(1/50) : 6.25 commandes toutes les 50 fps
        this.mode = 0;
    }

    init(){
        this.intervalDelay = (0.16*0.5)*1;/// 8 frames: (50/6.25)*(1/50) : 6.25 commandes toutes les 50 fps 
        this.frameOffsetMax = Math.floor( this.intervalDelay*50 + 0.05) ; // = 8 frames
        this.frame = Math.floor( this.intervalDelay*50 + 0.05) ; // = 8 frames
        this.frameMinCli =  this.frameOffsetMax;//(int)Math.Floor( this.frame*0.5 + 0.05);// = 4 frames
        this.timeStart = 0;

        this.intervalDelay *= 0.5;
    }
};

exports.GetGuid = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
};

exports.GetLocalIPAddress = function (PORT) {
    const result =  require('dns').lookup(require('os').hostname(), function (err, add, fam) {
        console.log( 'LAN: ' + add + ":" + PORT );
    });
};

exports.Count = function (element) {
    return Object.values(element).length;
};