const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Verifique se o diretório 'public/uploads' existe, caso contrário, crie-o
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do multer para salvar arquivos no diretório 'public/uploads'
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Phl0@5#9',
  database: 'cadastro',
});

// Conectar ao banco de dados
db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados: ', err);
    return;
  }
  console.log('Conectado ao banco de dados');
});

// Cadastro de um novo prestador e serviço
app.post('/cadastro', upload.fields([{ name: 'logoOng', maxCount: 1 }, { name: 'fotosCarrosel', maxCount: 10 }]), (req, res) => {
  const {
    nomeOng,
    telefoneOng,
    emailOng,
    linkSite,
    linkRedesSociais,
    enderecoOng,
    descricao,
    modeloOng, // Online, Presencial, Híbrido
    causa, // Alimentação, Educação, etc.
  } = req.body;

  const logoOng = req.files['logoOng'] ? req.files['logoOng'][0].path : null;
  const fotosCarrosel = req.files['fotosCarrosel'] ? req.files['fotosCarrosel'].map(file => file.path) : [];

  // Primeira inserção: Tabela PrestadorServico
  const queryPrestador = `INSERT INTO PrestadorServico (nomeOng, telefoneOng, emailOng, linkSite, linkRedesSociais, logoOng, fotosCarrosel, enderecoOng) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(queryPrestador, [nomeOng, telefoneOng, emailOng, linkSite, linkRedesSociais, logoOng, JSON.stringify(fotosCarrosel), enderecoOng], (err, resultPrestador) => {
    if (err) {
      console.error('Erro ao inserir prestador: ', err);
      return res.status(500).send('Erro ao cadastrar prestador');
    }

    const idUsuario = resultPrestador.insertId; // ID do prestador inserido

    // Segunda inserção: Tabela Tipo_Servico (pode ser dinâmico se causa for um campo variável)
    const queryTipoServico = `INSERT INTO Tipo_Servico (causa) VALUES (?)`;

    db.query(queryTipoServico, [causa], (err, resultTipoServico) => {
      if (err) {
        console.error('Erro ao inserir tipo de serviço: ', err);
        return res.status(500).send('Erro ao cadastrar tipo de serviço');
      }

      const idTipoServico = resultTipoServico.insertId; // ID do tipo de serviço inserido

      // Terceira inserção: Tabela Servico
      const queryServico = `INSERT INTO Servico (descricao, modeloOng, idUsuario, idTipoServico) VALUES (?, ?, ?, ?)`;

      db.query(queryServico, [descricao, modeloOng, idUsuario, idTipoServico], (err) => {
        if (err) {
          console.error('Erro ao inserir serviço: ', err);
          return res.status(500).send('Erro ao cadastrar serviço');
        }

        res.status(200).send('Cadastro realizado com sucesso!');
      });
    });
  });
});

// Iniciar o servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});