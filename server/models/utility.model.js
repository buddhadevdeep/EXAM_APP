const { poolPromise, mssql } = require('../config/db');

class UtilityModel {
  static async logActivity(userId, action, details, ipAddress = null) {
    try {
      const pool = await poolPromise;
      await pool.request()
        .input('userId', mssql.Int, userId)
        .input('action', mssql.NVarChar, action)
        .input('details', mssql.NVarChar, details)
        .input('ipAddress', mssql.NVarChar, ipAddress)
        .query('INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES (@userId, @action, @details, @ipAddress)');
    } catch (err) {
      console.error('Failed to log activity:', err.message);
    }
  }

  static async getActivityLogs() {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT TOP 100 al.*, u.email 
      FROM activity_logs al 
      LEFT JOIN users u ON al.user_id = u.id 
      ORDER BY al.created_at DESC
    `);
    return result.recordset;
  }

  static async getNotifications(userId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', mssql.Int, userId)
      .query('SELECT TOP 50 * FROM notifications WHERE user_id = @userId ORDER BY created_at DESC');
    return result.recordset;
  }

  static async createNotification(userId, title, message) {
    const pool = await poolPromise;
    await pool.request()
      .input('userId', mssql.Int, userId)
      .input('title', mssql.NVarChar, title)
      .input('message', mssql.NVarChar, message)
      .query('INSERT INTO notifications (user_id, title, message) VALUES (@userId, @title, @message)');
  }

  static async markNotificationRead(id) {
    const pool = await poolPromise;
    await pool.request()
      .input('id', mssql.Int, id)
      .query('UPDATE notifications SET is_read = 1 WHERE id = @id');
  }

  static async getSettings() {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM settings');
    return result.recordset.reduce((acc, current) => {
      acc[current.setting_key] = current.setting_value;
      return acc;
    }, {});
  }

  static async updateSetting(key, value) {
    const pool = await poolPromise;
    const check = await pool.request()
      .input('key', mssql.NVarChar, key)
      .query('SELECT 1 FROM settings WHERE setting_key = @key');

    if (check.recordset.length > 0) {
      await pool.request()
        .input('key', mssql.NVarChar, key)
        .input('value', mssql.NVarChar, value)
        .query('UPDATE settings SET setting_value = @value, updated_at = GETDATE() WHERE setting_key = @key');
    } else {
      await pool.request()
        .input('key', mssql.NVarChar, key)
        .input('value', mssql.NVarChar, value)
        .query('INSERT INTO settings (setting_key, setting_value) VALUES (@key, @value)');
    }
  }
}

module.exports = UtilityModel;
