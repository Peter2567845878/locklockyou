var pagethis;

function ab2s(buffer) {  
  var bytes = new Uint8Array(buffer);  
  var hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');  
  return hex;
}  

function LockAlert(message){
  console.log(message)
  wx.showModal({title:"错误", content:message, showCancel:false, })
} 

var pagedata = {
  data:{
    txt: "Hello, world!",
    bleWorking: false,
    bleList: [], // https://developers.weixin.qq.com/miniprogram/dev/api/device/bluetooth/wx.onBluetoothDeviceFound.html
    // texts
    pairing: false,
    bleConnected: false,
    alarming: false,
    pariSelected: -1,
    hashistory: false,
  },
  onLoad: function(){
    pagethis=this
    var history=wx.getStorageSync('history')
    if(history) this.setData({hashistory: true})
    ble.init(history)
  }, 
  appendBleList: function(arr){
    pagethis.setData({bleList: pagethis.data.bleList.concat(arr)})
  },
  /////////////////////////////////////////////////////////
  // 主要函数

  // 配对
  pair: function(){
    if(this.data.bleConnected){
      ble.Close()
    }
    this.setData({pairing: true, bleList: []})
    ble.listble()
  },

  // 选中
  bleselect: function(e){
    let i=parseInt(e.target.id)
    this.setData({
      pariSelected: i
    })
    ble.selected=this.data.bleList[i]
  },

  // 完成配对
  dopair: function(){
    this.setData({pairing: false})
    ble.setble()
  },

  // 开锁
  unlock: function(){
    var buffer = new ArrayBuffer(1);
    var view = new Uint8Array(buffer);  
    view[0]=0x02;
    ble.Write(buffer)
  },

  // 找车
  findcar: function(){
    var buffer = new ArrayBuffer(1);
    var view = new Uint8Array(buffer);
    if(this.data.alarming) view[0]=0x04;
    else view[0]=0x03;
    this.setData({alarming: !this.data.alarming})
    ble.Write(buffer)
  },

  // 读处理函数
  reader: function(buf){
    var arr = new Uint8Array(buf);  
    var alarm=(s)=>wx.showModal({title: "错误", content: s, showCancel: false,})
    if(arr.length<2){
      alarm("收到未知信息"+ab2s(buf))
      return -1
    }
    if(arr[0]==0){ // 成功
      if(arr[1]==1) ; // 测试
      else if(arr[1]==2) ; // 开锁
      else if(arr[1]==3) ; // 开警报
      else if(arr[1]==4) ; // 关警报
      else alarm("收到未知信息 "+ab2s(buf))
      return 0
    } else if(arr[0]==1){
      if(arr[1]==1) ; // 测试
      else if(arr[1]==2) ; // 开锁
      else if(arr[1]==3) ; // 开警报
      else if(arr[1]==4) ; // 关警报
      alarm("发生错误！代码："+ab2s(buf))
      return 1
    } else{
      alarm("收到未知信息 "+ab2s(buf))
      return -1
    } 
  }
}

////////////////////////////////////////////////
// ble
var ble= {
  history: null, // {name}
  // featureuuid: "CAFE",
  deviceId: null,
  serviceId: null,
  selected: null,
  Write: function(buffer){
    wx.writeBLECharacteristicValue({
      deviceId: ble.deviceId,
      serviceId: ble.serviceId,
      characteristicId: ble.writeuuid,
      value: buffer,
    })
  },
  setRead: function(readfunc){ // readfunc(Arraybuffer)
    wx.notifyBLECharacteristicValueChange({
      deviceId: ble.deviceId,
      serviceId: ble.serviceId,
      characteristicId: ble.readuuid,
      state: true,
    })
    wx.onBLECharacteristicValueChange(function(res) {
      
      if(res.characteristicId==ble.readuuid){
        readfunc(res.value)
      }
      else{
        LockAlert(res.serviceId+"发生变化！")
      }
    })
  },
  Close: function(){
    wx.closeBLEConnection({deviceId: this.deviceId})
    pagethis.setData({bleConnected: false})
  },
  init: function(history){
    ble.history=history
    wx.openBluetoothAdapter({
      success: function(){
        pagethis.setData({bleWorking: true})
        if(ble.history){
          wx.showToast({title: "尝试连接上次连接的车锁 "+ble.history.name, icon:"loading"})
          ble.connhistory()
        }
      },
      fail: function(){ 
        LockAlert("蓝牙授权失败！请确保蓝牙权限已开启；开启后请退出重进") 
        function recon(res){
          if(res.available){pagedata.setData({bleWorking: true})}
          else{pagedata.setData({bleWorking: false})}
        }
        wx.onBluetoothAdapterStateChange(recon)
      }
    })
  },
  // history process
  // connhistory->getserv->getchar->setrw
  connhistory: function(){
    wx.startBluetoothDevicesDiscovery({
      // services: [ble.featureuuid], // uuid prefix
      success: function(){
        setTimeout(function(){
          wx.getBluetoothDevices().then((res)=>{
            let arr=res.devices;
            
            for(let i = 0; i < arr.length; i++){
              
              if(arr[i].name && arr[i].name==ble.history.name){ // found
                wx.stopBluetoothDevicesDiscovery()
                let dev=arr[i]
                ble.deviceId=dev.deviceId
                wx.createBLEConnection({
                  deviceId: dev.deviceId,
                  success: ble.getserv
                })
                return;
              }
            }
          })
        }, 1000)
      }
    })
  },
  getserv: function(){
    wx.getBLEDeviceServices({
      deviceId: ble.deviceId,
      success: ble.getchar
    })
  },
  getchar: function(res){
    for (let i = 0; i < res.services.length; i++) {
      if (res.services[i].isPrimary) {
        ble.serviceId=res.services[i].uuid
        wx.getBLEDeviceCharacteristics({
          deviceId: ble.deviceId,
          serviceId: ble.serviceId,
          success: ble.setrw
        })
        break
      }
    }
  },
  setrw: function(res){
    for (let i = 0; i < res.characteristics.length; i++) {
      let item = res.characteristics[i]
      if (item.uuid.substring(4,8)=="FFE3") {
        ble.writeuuid=item.uuid
      }
      if (item.uuid.substring(4,8)=="FFE1") {
        ble.readuuid=item.uuid
        ble.setRead(pagedata.reader)
      }
    }
    pagethis.setData({bleConnected: true})
    wx.showToast({title: "蓝牙连接成功"})
  },

  // new process
  // list->set->getserv->getchar->setrw
  listble: function(){
    // pagethis.setData({bleList: []})
    wx.startBluetoothDevicesDiscovery({
      // services: [ble.featureuuid], // TODO 
      success: function(e){
        function searchloop(){
          if(!pagethis.data.pairing) return;
          wx.getBluetoothDevices()
          .then((res)=>{
            let devarr=[];
            let arr=res.devices;
            for(let i = 0; i < arr.length; i++){
              if(arr[i].name && arr[i].name.substring(0,4)=="LOCK"){
                devarr.push(arr[i]);
              }
            }
            pagethis.setData({bleList: devarr});
          })
          setTimeout(searchloop, 3000);
        }
        setTimeout(searchloop, 1000);
        
      }
      
    })
  },
  setble: function(){
    let dev=this.selected
    wx.stopBluetoothDevicesDiscovery()
    ble.history={name: dev.name}
    wx.setStorageSync("history", this.history)
    ble.deviceId=dev.deviceId
    wx.createBLEConnection({
      deviceId: dev.deviceId,
      success: ble.getserv
    })
  }
}

Page(pagedata);
