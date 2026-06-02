import cloudinary from '../config/cloudinary.js';

export const getImages = async (req, res) => {
  try {
    // Busca recursos (imagens) na pasta thallyta-gallery do cloudinary
    // Se a conta for free e não quiser usar pasta, usamos uma tag específica
    // Vamos usar a Admin API listando pelas imagens do projeto
    const { resources } = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'thallyta-studio/', // Vamos fazer upload pra essa pasta no cloudinary
      max_results: 100,
      context: true,
      tags: true
    });
    
    // Mapear os recursos para o formato que o frontend espera
    const images = resources.map(img => ({
      id: img.public_id,
      src: img.secure_url,
      alt: img.context?.custom?.alt || 'Imagem do estúdio',
      category: img.context?.custom?.category || 'Todas',
      createdAt: img.created_at
    }));
    
    res.json(images);
  } catch (error) {
    console.error('Erro ao buscar imagens:', error);
    res.status(500).json({ error: 'Erro ao buscar imagens do Cloudinary' });
  }
};

export const uploadImage = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    const { category, alt } = req.body;
    
    const uploadPromises = req.files.map(file => {
      return new Promise((resolve, reject) => {
        const upload_stream = cloudinary.uploader.upload_stream(
          {
            folder: 'thallyta-studio',
            context: `category=${category || 'Todas'}|alt=${alt || 'Imagem do estúdio'}`
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        upload_stream.end(file.buffer);
      });
    });

    const uploadResults = await Promise.all(uploadPromises);
    
    const newImages = uploadResults.map(result => ({
      id: result.public_id,
      src: result.secure_url,
      alt: alt || 'Imagem do estúdio',
      category: category || 'Todas',
      createdAt: result.created_at
    }));
    
    res.status(201).json(newImages);
  } catch (error) {
    console.error('Erro no upload múltiplo:', error);
    res.status(500).json({ error: 'Erro ao fazer upload das imagens' });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const { id } = req.query; // Pega o ID da query param, ex: ?id=thallyta-studio/123
    
    if (!id) {
      return res.status(400).json({ error: 'ID não fornecido' });
    }
    
    const result = await cloudinary.uploader.destroy(id);
    
    if (result.result === 'ok') {
      res.json({ message: 'Imagem deletada com sucesso' });
    } else {
      res.status(400).json({ error: 'Falha ao deletar a imagem no Cloudinary' });
    }
  } catch (error) {
    console.error('Erro ao deletar:', error);
    res.status(500).json({ error: 'Erro ao deletar a imagem' });
  }
};
