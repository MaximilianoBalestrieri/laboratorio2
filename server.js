// Importar las dependencias necesarias
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

// Crear una instancia de Express
const app = express();

// Configurar el bodyParser para manejar datos enviados por POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configuración de la conexión a la base de datos
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root', // Cambia esto si tu usuario de MySQL es diferente
  password: '', // Cambia esto si tu MySQL tiene una contraseña
  database: 'integrador'
});

// Conectar a la base de datos
connection.connect((err) => {
  if (err) {
    console.error('Error de conexión: ' + err.stack);
    return;
  }
  console.log('Estas Conectado a la base de datos MySQL.');
});

connection.query('SELECT * FROM login', function (err, result){
  if (err) throw err;
  console.log(result)
});
/*
  // Consulta SQL para buscar el usuario y contraseña
  //const query = 'SELECT * FROM login WHERE usuario = ? AND contraseña = ?';
  const query = 'SELECT * FROM login';
  connection.query(query, (err, results, fields) => {
    console.log("ver: ",fields);
    if (err) {
      console.error(err);
      res.status(500).send('Error en el servidor');
    } else {
      console.log(results);
      console.log("ver: ",fields);
      if (results.length > 0) {
       
        const user = results[0];
        // Si las credenciales son válidas, enviar la especialidad del usuario
        res.json({
          success: true,
          message: 'Login exitoso',
          especialidad: user.especialidad
        });
      } else {
        // Si no se encuentran las credenciales, enviar un mensaje de error
        res.json({ success: false, message: 'Usuario o contraseña incorrectos' });
      }
    }
  });*/


// Configurar el servidor para que escuche en el puerto 3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);

  connection.end;
});