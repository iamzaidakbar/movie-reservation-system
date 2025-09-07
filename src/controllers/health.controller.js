const getHealth = (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is up and running 🚀",
    timestamp: new Date(),
  });
};

module.exports = { getHealth };
