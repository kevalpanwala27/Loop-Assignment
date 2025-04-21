module.exports = (sequelize, DataTypes) => {
  const Report = sequelize.define("Report", {
    report_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    status: {
      type: DataTypes.ENUM("running", "complete"),
      defaultValue: "running",
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });

  return Report;
};
