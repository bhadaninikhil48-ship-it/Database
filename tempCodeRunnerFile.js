let getRandomData = () =>{


  return [
     faker.string.uuid(),
    faker.internet.username(),
    faker.internet.email(),
    // avatar: faker.image.avatar(),
    faker.internet.password(),
    // birthdate: faker.date.birthdate(),
    // registeredAt: faker.date.past(),
  ];

}