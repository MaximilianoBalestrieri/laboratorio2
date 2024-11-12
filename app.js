// Importar las dependencias necesarias
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path'); // Para manejar rutas
const cors = require('cors');
const app = express();
const port = 3000;
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
// Configurar EJS como motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Asegurarse de que las vistas se sirvan desde la carpeta views
// Configuración de la conexión a la base de datos
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root', // Cambia esto si tu usuario de MySQL es diferente
  password: '', // Cambia esto si tu MySQL tiene una contraseña
  database: 'integrador'
});
connection.connect((err) => {
  if (err) {
    console.error('Error de conexión: ' + err.stack);
    return;
  }
  console.log('Estas Conectado a la base de datos MySQL.');
});

//-------------
app.get("/", function (req, res) {
  res.render("index.ejs")
});
let dniMedico; // declaro la variable global para despues usarla en la consulta
let formattedDate;
let nombreMedico;
let dniPaciente;
let medi;

// Ruta para validar el login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  //console.log('Datos recibidos:', { username, password });
  let dniUsuario = username;
  dniMedico = username;
  if (!username || !password) {
    res.status(400).json({ success: false, message: 'Faltan campos obligatorios.' });
    return;
  }
  const query = `SELECT 
    l.username, 
    l.password, 
    l.especialidad, 
    p.dni, 
    p.apellido, 
    p.especialidad, 
    p.celular
  FROM 
    Login l
  INNER JOIN Profesional p ON l.username = p.dni
  WHERE username = ? AND password = ?`;
  connection.query(query, [username, password], (err, results) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ success: false, message: 'Error en el servidor.' });
      return;
    }

    if (results.length > 0) {
      const apellido = results[0].apellido;  // Obtener la especialidad
      const especialidad = results[0].especialidad;  // Obtener la especialidad
     /* console.log('Usuario encontrado. Especialidad:', especialidad, apellido);
      console.log('Datos recibidos:', { username, password, especialidad });
      console.log('el dni del usuario es ', dniUsuario)*/
      nombreMedico = apellido;
      // Usuario y contraseña son correctos
      res.json({ success: true, especialidad: especialidad, apellido: apellido });

    } else {
      // Usuario o contraseña incorrectos
      res.json({ success: false, message: 'Usuario o contraseña incorrectos.' });
    }
  });
});


// Ruta para mostrar los registros de los usuarios
app.get('/usuarios', (req, res) => {
  connection.query('SELECT * FROM login order by especialidad', function (err, result) {
    if (err) {
      return res.status(500).send('Error en la consulta a la base de datos');
    } else {
      // Renderiza la vista "usuarios.ejs" y pasa los resultados a la plantilla
      res.render('usuarios', { data: result });
    }
  });
});
// Ruta para mostrar los registros de los profesionales
app.get('/profesionales', (req, res) => {
  const consulta = 'SELECT * FROM profesional where especialidad <> "Administrador" order by especialidad';
  connection.query(consulta, function (err, result) {
    if (err) {
      return res.status(500).send('Error en la consulta a la base de datos');
    } else {
      // Renderiza la vista "profesionales.ejs" y pasa los resultados a la plantilla
      res.render('profesionales', { data: result });
    }
  });
});

// Ruta para mostrar los registros de los pacientes
app.get('/pacientes', (req, res) => {
  const consulta = 'SELECT nombre, dni, nacimiento, telefono, sexo FROM paciente order by nombre';
  connection.query(consulta, function (err, result) {
    if (err) {
      return res.status(500).send('Error en la consulta a la base de datos');
    } else {
      // Renderiza la vista "profesionales.ejs" y pasa los resultados a la plantilla
      res.render('pacientes', { data: result });
    }
  });
});

// Ruta para mostrar la agenda
app.get('/agenda', (req, res) => {
  let fecha = req.query.fecha;
  if (!fecha) {
    const today = new Date(); const year = today.getFullYear(); const month = String(today.getMonth() + 1).padStart(2, '0'); // Los meses comienzan en 0 const day = String(today.getDate()).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    fecha = `${year}-${month}-${day}`
  }
const consulta = `SELECT DISTINCT a.horaInicio, p.nombre, p.dni, a.motivoConsulta, a.estadoConsulta, a.idMedico, a.fechaInicio, a.idAgenda  
FROM paciente p
JOIN agenda a ON p.dni = a.dniPaciente  
JOIN profesional m ON a.idMedico = m.dni      
WHERE a.idMedico = ?  
AND a.fechaInicio = ? `;
  connection.query(consulta, [dniMedico, fecha], function (err, result) {
   // console.log('datos agenda',result)
    if (err) {
      return res.status(500).send('Error en la consulta a la base de datos');
    } else {
      // Renderiza la vista "agenda.ejs" y pasa los resultados a la plantilla
      res.render('agenda', { data: result });

    }
  });
});

// Atencion medica
app.get('/historia/:dniPaciente/:idAgenda/:motivoConsulta', async (req, res) => {

  let fecha = req.query.fecha;
  if (!fecha) {
    const today = new Date(); const year = today.getFullYear(); const month = String(today.getMonth() + 1).padStart(2, '0'); // Los meses comienzan en 0 const day = String(today.getDate()).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    fecha = `${year}-${month}-${day}`
  }
  const dniPaciente = req.params.dniPaciente;
  const idAgenda = req.params.idAgenda;
  const query = 'UPDATE agenda SET estadoConsulta = ? WHERE idAgenda = ?';
  const values = ['ATENDIDO', Number(idAgenda)]; // Values to be inserted
  connection.query(query, values, (err, results) => {
    if (err) {
      console.error('Error updating agenda:', err);
      return res.status(500).send('An error occurred while updating the record.');
    }
  });

  const medicamentos = await new Promise((res, rej) => { // trae los medicamentos del paciente
  const consulta = `SELECT DISTINCT p.nombre, p.dni, p.nacimiento, p.sexo, p.telefono,
  m.nombreMedicamento, m.dosis, m.frecuencia
  FROM paciente p
  INNER JOIN medicamentos m
  ON p.dni = m.dniPaciente      
  WHERE p.dni = ? `;

    connection.query(consulta, [dniPaciente], function (err, results) {
      if (err) {
        rej(err)
      } else {
        res(results);
      }
    });
  })
  const paciente = await new Promise((res, rej) => {  // datos del paciente
    const consulta = `SELECT DISTINCT p.nombre, p.dni, p.nacimiento, p.sexo, p.telefono
     FROM paciente p     
    WHERE p.dni = ? `;
      connection.query(consulta, [dniPaciente], function (err, results) {
        if (err) {
          rej(err)
        } else {
              res(results[0]);        
        }
      });
    })

    const medico = await new Promise((res, rej) => {  // datos del paciente
    const consulta = `SELECT DISTINCT  p.dni as dniPaciente,  m.dni as dniMedico, m.apellido as nombreMedico, a.fechainicio
  FROM paciente p INNER JOIN agenda a INNER JOIN profesional m
  ON m.dni = a.idMedico     
  WHERE a.fechaInicio = ? 
  and p.dni = ?
  and a.idMedico = ? `;
        connection.query(consulta, [ fecha, dniPaciente, dniMedico ], function (err, results) {
         // console.log('datos de la consulta de medico: ', results);
          if (err) {
            rej(err)
          } else {
                res(results);        
          }
        });
      })

const alergias = await new Promise((res, rej) => { // trae las alergias del paciente
const consulta = `SELECT  *
      FROM alergias a  
      WHERE a.dniPaciente = ? `;
        connection.query(consulta, [dniPaciente], function (err, results) {
          if (err) {
            rej(err)
          } else {
          //  res(JSON.parse(JSON.stringify(results)));
            res(results);          
          }
        });
      })

      const antecedentes = await new Promise((res, rej) => { // trae los antecedentes del paciente
        const consulta = `SELECT  *
        FROM antecedentes a  
        WHERE a.dniPaciente = ? `;
          connection.query(consulta, [dniPaciente], function (err, results) {
            if (err) {
              rej(err)
            } else {
              res(results);
              }
          });
        })

        const habitos = await new Promise((res, rej) => { // trae los habitos del paciente
          const consulta = `SELECT  *
          FROM habitos h  
          WHERE h.dniPaciente = ? `;        
            connection.query(consulta, [dniPaciente], function (err, results) {
              if (err) {
                rej(err)
              } else {
                res(results);
              }
            });
          }) 
          
          const atenciones = await new Promise((res, rej) => { // trae las atenciones previas del paciente
            const consulta = `SELECT  *
            FROM atenciones a  
            WHERE a.dniPaciente = ? `;
              connection.query(consulta, [dniPaciente], function (err, results) {
                if (err) {
                  rej(err)
                } else {
                  res(results);
                  }
              });
            })         

           const historial = await new Promise((res, rej) => { // trae el historial del paciente
              const consulta = `SELECT  fecha, motivo, nombre, diagnostico
              FROM atenciones a  
              WHERE a.dniPaciente = ? order by fecha asc`;
                connection.query(consulta, [dniPaciente], function (err, results) {
                  //console.log('datos de las atenciones ',results);
                  if (err) {
                    rej(err)
                  } else {
                    res(results);
                    }
                });
              })     

            const evolucion = await new Promise((res, rej) => { // trae el historial de las evoluciones
            const consulta = `SELECT p.dni AS dni_paciente, e.dniMedico, e.fechaEvolucion, e.evolucion
                              FROM paciente p
                              INNER JOIN evoluciones e ON p.dni = e.dniPaciente
                              WHERE p.dni = ?
                              AND e.dniMedico = ?  order by e.fechaEvolucion asc`;
                  connection.query(consulta, [dniPaciente, dniMedico], function (err, results) {
                    //console.log('datos:', results);
                      if (err) {
                      rej(err)
                    } else {
                    //  res(JSON.parse(JSON.stringify(results)));
                      res(results);
                      }
                  });
                })      
   
                const plantillas = await new Promise((res, rej) => {  // datos del paciente
                  const consulta = `SELECT DISTINCT  nombreplantilla, textoplantilla
                FROM plantillas
                WHERE dnimedico = ? `;
                      connection.query(consulta, [ dniMedico ], function (err, results) {
                        if (err) {
                          rej(err)
                        } else {
                              res(results);        
                        }
                      });
                    })              

  res.render('historia', { idAgenda:+req.params.idAgenda, user: medicamentos, paciente, medico, alergias, antecedentes, habitos, atenciones, historial, evolucion, plantillas });  
 
});

//------ vista de HCE
app.get('/vistaHistoria/:dniPaciente/:idAgenda', async (req, res) => {

  let fecha = req.query.fecha;
  if (!fecha) {
    const today = new Date(); const year = today.getFullYear(); const month = String(today.getMonth() + 1).padStart(2, '0'); // Los meses comienzan en 0 const day = String(today.getDate()).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    fecha = `${year}-${month}-${day}`
  }

  const dniPaciente = req.params.dniPaciente;
  const idAgenda = req.params.idAgenda;
 
 
  const medicamentos = await new Promise((res, rej) => { // trae los medicamentos del paciente
  const consulta = `SELECT DISTINCT p.nombre, p.dni, p.nacimiento, p.sexo, p.telefono,
  m.nombreMedicamento, m.dosis, m.frecuencia
  FROM paciente p
  INNER JOIN medicamentos m
  ON p.dni = m.dniPaciente      
  WHERE p.dni = ? `;

    connection.query(consulta, [dniPaciente], function (err, results) {
      if (err) {
        rej(err)
      } else {
        res(results);
      }
    });
  })
  const paciente = await new Promise((res, rej) => {  // datos del paciente
    const consulta = `SELECT DISTINCT p.nombre, p.dni, p.nacimiento, p.sexo, p.telefono
     FROM paciente p     
    WHERE p.dni = ? `;
      connection.query(consulta, [dniPaciente], function (err, results) {
        if (err) {
          rej(err)
        } else {
              res(results[0]);        
        }
      });
    })

    const medico = await new Promise((res, rej) => {  // datos del paciente
    const consulta = `SELECT DISTINCT  p.dni as dniPaciente,  m.dni as dniMedico, m.apellido as nombreMedico, a.fechainicio
  FROM paciente p INNER JOIN agenda a INNER JOIN profesional m
  ON m.dni = a.idMedico     
  WHERE a.fechaInicio = ? 
  and p.dni = ?
  and a.idMedico = ? `;
        connection.query(consulta, [ fecha, dniPaciente, dniMedico ], function (err, results) {
         // console.log('datos de la consulta de medico: ', results);
          if (err) {
            rej(err)
          } else {
                res(results);        
          }
        });
      })

    const alergias = await new Promise((res, rej) => { // trae las alergias del paciente
      const consulta = `SELECT  *
      FROM alergias a  
      WHERE a.dniPaciente = ? `;
        connection.query(consulta, [dniPaciente], function (err, results) {
          if (err) {
            rej(err)
          } else {
          //  res(JSON.parse(JSON.stringify(results)));
            res(results);          
          }
        });
      })

      const antecedentes = await new Promise((res, rej) => { // trae los antecedentes del paciente
        const consulta = `SELECT  *
        FROM antecedentes a  
        WHERE a.dniPaciente = ? `;
          connection.query(consulta, [dniPaciente], function (err, results) {
            if (err) {
              rej(err)
            } else {
              res(results);
              }
          });
        })

        const habitos = await new Promise((res, rej) => { // trae los habitos del paciente
          const consulta = `SELECT  *
          FROM habitos h  
          WHERE h.dniPaciente = ? `;        
            connection.query(consulta, [dniPaciente], function (err, results) {
              if (err) {
                rej(err)
              } else {
                res(results);
              }
            });
          }) 
          
          const atenciones = await new Promise((res, rej) => { // trae las atenciones previas del paciente
            const consulta = `SELECT  *
            FROM atenciones a  
            WHERE a.dniPaciente = ? `;
              connection.query(consulta, [dniPaciente], function (err, results) {
                if (err) {
                  rej(err)
                } else {
                  res(results);
                  }
              });
            })         

           const historial = await new Promise((res, rej) => { // trae el historial del paciente
              const consulta = `SELECT  fecha, motivo, nombre, diagnostico
              FROM atenciones a  
              WHERE a.dniPaciente = ? order by fecha desc`;
                connection.query(consulta, [dniPaciente], function (err, results) {
                  //console.log('datos de las atenciones ',results);
                  if (err) {
                    rej(err)
                  } else {
                    res(results);
                    }
                });
              })     

            const evolucion = await new Promise((res, rej) => { // trae el historial de las evoluciones
            const consulta = `SELECT p.dni AS dni_paciente, e.dniMedico, e.fechaEvolucion, e.evolucion
                              FROM paciente p
                              INNER JOIN evoluciones e ON p.dni = e.dniPaciente
                              WHERE p.dni = ?
                              AND e.dniMedico = ?  order by e.fechaEvolucion desc`;
                  connection.query(consulta, [dniPaciente, dniMedico], function (err, results) {
                    //console.log('datos:', results);
                      if (err) {
                      rej(err)
                    } else {
                    //  res(JSON.parse(JSON.stringify(results)));
                      res(results);
                      }
                  });
                })      
           
  res.render('vistaHistoria', { idAgenda:+req.params.idAgenda, user: medicamentos, paciente, medico, alergias, antecedentes, habitos, atenciones, historial, evolucion });  
});

app.post('/antecedentes', (req, res) => { //agrega antecedentes
  const { dnipaciente, antecedentes, fechadesde, fechahasta } = req.body;
  const query = `INSERT INTO antecedentes (dniPaciente, nombreAntecedente, fechaDesde, FechaHasta)
                 VALUES (?, ?, ?, ?)`;  
  connection.query(query, [dnipaciente, antecedentes, fechadesde, fechahasta], (err, results) => {
    //console.log('los resultados antecedente son ', results)   
    if (err) {
          console.error('error al insertar:', err);
          res.status(500).send({ message: 'Error al insertar' });
      } else {
          res.send({ message: 'Hábito agregado con éxito' });
          res.render('historia');
      }
  });
});

app.post('/alergia', (req, res) => { //agrega alergia
  const { dnipaciente, alergia, importancia, fechadesde, fechahasta } = req.body;
  const query = `INSERT INTO alergias (dniPaciente, nombreAlergia, importancia, fechaDesde, FechaHasta)
                 VALUES (?, ?, ?, ?, ?)`;
  connection.query(query, [dnipaciente ,alergia, importancia, fechadesde, fechahasta], (err, results) => {
    //console.log(results);    
    if (err) {
          console.error('error al insertar:', err);
          res.status(500).send({ message: 'Error al insertar' });
      } else {
          res.send({ message: 'Alergia agregado con éxito' });
          res.render('historia');
      }
  });
});

app.post('/medicamento', (req, res) => { //agrega medicamento
  const { dnipaciente, medicamento, dosis, frecuencia } = req.body;
  const query = `INSERT INTO medicamentos (dniPaciente, nombreMedicamento, dosis, frecuencia)
                 VALUES (?, ?, ?, ?)`;
  connection.query(query, [dnipaciente ,medicamento, dosis, frecuencia], (err, results) => {
        if (err) {
          console.error('error al insertar:', err);
          res.status(500).send({ message: 'Error al insertar' });
      } else {
          res.send({ message: 'Medicamento agregado con éxito' });
          res.render('historia');
      }
  });
});

app.post('/habitos', (req, res) => { //agrega hábito
  const { dnipaciente, habito, fechadesde, fechahasta } = req.body;
  const query = `INSERT INTO habitos (dniPaciente, nombreHabito, fechaDesde, FechaHasta)
                 VALUES (?, ?, ?, ?)`;
  connection.query(query, [dnipaciente , habito, fechadesde, fechahasta], (err, results) => {
   // console.log('los resultados son ',results)   
    if (err) {
          console.error('error al insertar:', err);
          res.status(500).send({ message: 'Error al insertar' });
      } else {
          res.send({ message: 'Hábito agregado con éxito' });
          res.render('historia');
      }
  });
});

app.post('/nuevaHistorial', (req, res) => {  //agrega la historia
  const { dnipaciente, fecha, motivo, medico, diagnostico } = req.body;  
  const query = `INSERT INTO atenciones (dniPaciente, fecha, motivo, nombre, diagnostico) VALUES (?, ?, ?, ?, ?)`;
  connection.query(query, [dnipaciente, fecha, motivo, medico, diagnostico], (err, results) => {
   // console.log(results); 
    if (err) {
          console.error('error al insertar:', err);
          res.status(500).send({ message: 'Error al insertar' });
      } else {
          res.send({ message: 'Atención agregada con éxito' });
      }
  });
});

app.post('/evolucion', (req, res) => {  //agrega la evolucion
  const { dnimedico, dnipaciente, evaluaciones, fecha } = req.body;  
  const query = `INSERT INTO evoluciones (dniMedico, dniPaciente, evolucion, fechaEvolucion) VALUES (?, ?, ?, ?)`;
  connection.query(query, [ dnimedico, dnipaciente, evaluaciones, fecha], (err, results) => {
    //console.log('insercion de la evolucion', results) 
    if (err) {
          console.error('error al insertar:', err);
          res.status(500).send({ message: 'Error al insertar' });
      } else {
          res.send({ message: 'Atención agregada con éxito' });
      }
  });
});

app.post('/estado', (req, res) => {
  const { idAgenda } = req.body;

  // Input Sanitization: Use parameterized query
  const query = 'UPDATE agenda SET estadoConsulta = ? WHERE idAgenda = ?';
  const values = ['ATENDIDO', idAgenda]; // Values to be inserted
  connection.query(query, values, (err, results) => {
    if (err) {
      console.error('Error updating agenda:', err);
      return res.status(500).send('An error occurred while updating the record.');
    }
    console.log('Agenda actualizada correctamente:', results);
    res.status(200).send('Agenda status updated successfully.');
  });
});


app.use(express.static("public"));

// Iniciar el servidor
app.listen(3000, () => {
  console.log('Servidor ejecutándose en http://localhost:3000');
});
// Obtener la fecha actual del sistema
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0'); // Los meses son de 0 a 11, por eso sumamos 1
const day = String(today.getDate()).padStart(2, '0'); // Asegura que el día tenga dos dígitos

// Formatear la fecha como 'YYYY-MM-DD'
formattedDate = `${year}-${month}-${day}`;