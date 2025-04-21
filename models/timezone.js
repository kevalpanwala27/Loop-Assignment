module.exports = (sequelize, DataTypes) => {
  const Timezone = sequelize.define(
    "Timezone",
    {
      store_id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      timezone_str: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      timestamps: false,
    }
  );

  return Timezone;
};
