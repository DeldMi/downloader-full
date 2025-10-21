const { getInfo } = require('../services/infoService');

exports.getInfo = async (req, res) => {
  try {
    const result = await getInfo(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};