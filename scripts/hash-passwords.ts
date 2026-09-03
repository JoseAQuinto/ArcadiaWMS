import bcrypt from "bcryptjs";

async function main() {
  const admin = await bcrypt.hash("Admin123!", 10);
  const operator = await bcrypt.hash("Operator123!", 10);
  console.log("admin   :", admin);
  console.log("operator:", operator);
}

main();
