Page({
  data: {
    isPaired: false,
    isUnlocked: false
  },
  pairDevice: function() {
    // 模拟配对过程
    setTimeout(() => {
      this.setData({
        isPaired: true
      });
      wx.showToast({
        title: '配对成功',
        icon: 'success'
      });
    }, 2000);
  },
  unlockDevice: function() {
    if (this.data.isPaired) {
      // 模拟开锁过程
      setTimeout(() => {
        this.setData({
          isUnlocked: true
        });
        wx.showToast({
          title: '开锁成功',
          icon: 'success'
        });
      }, 2000);
    } else {
      wx.showToast({
        title: '请先配对设备',
        icon: 'none'
      });
    }
  },
  findCar: function() {
    if (this.data.isPaired) {
      // 处理找车逻辑
      wx.showToast({
        title: '正在找车...',
        icon: 'loading',
        duration: 2000
      });
    } else {
      wx.showToast({
        title: '请先配对设备',
        icon: 'none'
      });
    }
  }
})