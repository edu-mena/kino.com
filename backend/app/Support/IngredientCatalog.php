<?php

namespace App\Support;

/**
 * Catálogo de ingredientes comuns em restaurantes angolanos — cópia de
 * `src/data/ingredient-catalog.ts` (frontend), usada no backend para
 * reconhecer ingredientes nas descrições dos pratos importados (ver
 * App\Services\MenusAo\IngredientRecognizer). Um teste garante que as duas
 * listas ficam iguais: muda lá, muda aqui.
 */
class IngredientCatalog
{
    /** @var list<string> */
    public const NAMES = [
        'Asas de Frango', 'Atum Fresco', 'Bacalhau', 'Bacon', 'Barracuda Fresca', 'Camarão', 'Camarão Fresco',
        'Camarão Gigante', 'Carapau Fresco', 'Carne Moída', 'Carne de Cabra', 'Carne de Vaca', 'Chouriço',
        'Costela Bovina', 'Costela de Porco', 'Costeleta de Porco', 'Entrecosto', 'Frango', 'Frango Desfiado',
        'Frango Grelhado', 'Galinha', 'Galinha Caipira', 'Gambas Frescas', 'Lagosta Fresca',
        'Linguiça Artesanal', 'Lula Fresca', 'Marisco Variado', 'Mexilhão', 'Ovo', 'Ovo Estrelado',
        'Ostras Frescas', 'Peixe Bagre', 'Peixe Branco', 'Peixe Fresco', 'Peixe Seco', 'Peixe-Espada',
        'Picanha', 'Polvo', 'Presunto', 'Salame', 'Salmão Fresco', 'Salsicha', 'Catupiry', 'Cream Cheese',
        'Gorgonzola', 'Iogurte Natural', 'Leite Condensado', 'Leite Natural', 'Manteiga', 'Manteiga de Alho',
        'Mascarpone', 'Mozzarella', 'Natas', 'Parmesão', 'Provolone', 'Queijo', 'Queijo Fresco',
        'Queijo Ralado', 'Abóbora', 'Abobrinha', 'Alface', 'Alho', 'Alho Francês', 'Batata', 'Batata Doce',
        'Beringela', 'Beterraba', 'Brócolos', 'Cebola', 'Cebola Roxa', 'Cenoura', 'Cogumelos', 'Couve',
        'Couve-Flor', 'Espinafre', 'Feijão Verde', 'Gengibre', 'Milho', 'Pepino', 'Pimento Verde',
        'Pimento Vermelho', 'Quiabo', 'Repolho', 'Rúcula', 'Tomate', 'Tomate Cherry', 'Abacate', 'Abacaxi',
        'Ananás', 'Banana', 'Banana Pão', 'Coco', 'Kiwi', 'Laranja', 'Limão', 'Maçã', 'Manga', 'Maracujá',
        'Melancia', 'Morango', 'Papaia', 'Uva', 'Arroz', 'Arroz Basmati', 'Farinha de Milho',
        'Farinha de Trigo', 'Feijão Branco', 'Feijão Preto', 'Feijão Vermelho', 'Fuba', 'Funge', 'Macaroni',
        'Massa', 'Massa Esparguete', 'Massa Fresca', 'Noodles', 'Pão', 'Pão Caseiro', 'Pão de Milho',
        'Pipoca', 'Quinoa', 'Tortilha', 'Alecrim', 'Canela', 'Coentros', 'Colorau', 'Cominhos', 'Cravinho',
        'Curcuma', 'Louro', 'Malagueta', 'Noz-Moscada', 'Orégãos', 'Paprika', 'Pimenta Preta', 'Piri-Piri',
        'Salsa', 'Tomilho', 'Azeite', 'Azeite Extra Virgem', 'Azeitonas', 'Ketchup', 'Maionese',
        'Molho Barbecue', 'Molho Branco', 'Molho Piri-Piri', 'Molho Soja', 'Molho de Alho', 'Molho de Tomate',
        'Mostarda', 'Óleo de Amendoim', 'Óleo de Girassol', 'Óleo de Palma (Dendém)', 'Vinagre', 'Vinagrete',
        'Amendoim', 'Amêndoas', 'Castanha de Caju', 'Ervilhas', 'Grão-de-Bico', 'Lentilhas', 'Açúcar',
        'Baunilha', 'Canela em Pó', 'Chocolate', 'Chocolate em Pó', 'Cravo', 'Fermento', 'Mel', 'Sal',
        'Sumo de Limão', 'Café', 'Chá', 'Sumo Natural', 'Água com Gás', 'Calulu', 'Farofa',
        'Feijão de Óleo de Palma', 'Funge de Bombó', 'Gindungo', 'Jindungo Seco', 'Kizaca', 'Mandioca',
        'Muamba', 'Óleo de Palma', 'Pirão',
    ];
}
