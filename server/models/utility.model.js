const {
  ActivityLog: MongoActivityLog,
  Notification: MongoNotification,
  Setting: MongoSetting,
  User: MongoUser,
  getNextSequenceValue
} = require('./mongoose.model');

class UtilityModel {
  static async logActivity(userId, action, details, ipAddress = null) {
    try {
      const nextId = await getNextSequenceValue('activity_logs');
      await MongoActivityLog.create({
        _id: nextId,
        user_id: userId || null,
        action,
        details,
        ip_address: ipAddress
      });
    } catch (err) {
      console.error('Failed to log activity:', err.message);
    }
  }

  static async getActivityLogs() {
    const logs = await MongoActivityLog.find().sort({ created_at: -1 }).limit(100).lean();
    const userIds = logs.map(l => l.user_id).filter(id => id !== null);
    const users = await MongoUser.find({ _id: { $in: userIds } }).lean();
    const userMap = new Map(users.map(u => [u._id, u]));

    return logs.map(l => ({
      ...l,
      id: l._id,
      email: l.user_id ? (userMap.get(l.user_id) ? userMap.get(l.user_id).email : '') : null
    }));
  }

  static async getNotifications(userId) {
    const notifications = await MongoNotification.find({ user_id: userId }).sort({ created_at: -1 }).limit(50).lean();
    return notifications.map(n => ({
      ...n,
      id: n._id
    }));
  }

  static async createNotification(userId, title, message) {
    const nextId = await getNextSequenceValue('notifications');
    await MongoNotification.create({
      _id: nextId,
      user_id: userId,
      title,
      message,
      is_read: 0
    });
  }

  static async markNotificationRead(id) {
    await MongoNotification.findByIdAndUpdate(id, { $set: { is_read: 1 } });
  }

  static async getSettings() {
    const settings = await MongoSetting.find().lean();
    return settings.reduce((acc, current) => {
      acc[current.setting_key] = current.setting_value;
      return acc;
    }, {});
  }

  static async updateSetting(key, value) {
    let setting = await MongoSetting.findOne({ setting_key: key });
    if (setting) {
      setting.setting_value = value;
      setting.updated_at = Date.now();
      await setting.save();
    } else {
      const nextId = await getNextSequenceValue('settings');
      await MongoSetting.create({
        _id: nextId,
        setting_key: key,
        setting_value: value
      });
    }
  }
}

module.exports = UtilityModel;
