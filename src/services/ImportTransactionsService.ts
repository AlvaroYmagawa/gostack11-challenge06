import { In, getRepository, getCustomRepository } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';

// CUSTOM IMPORTS
import TransactionRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  filePath: string;
}

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ filePath }: Request): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionRepository);
    const categoriesRepository = getRepository(Category);

    const contactsReadStream = fs.createReadStream(filePath);

    const parsers = csvParse({
      from_line: 2,
    });

    const parseCSV = contactsReadStream.pipe(parsers);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      categories.push(category);

      transactions.push({ title, type, value, category });
    });

    // Wait for parseCSV proccessing end
    await new Promise(resolve => parseCSV.on('end', resolve));

    // Get an array of categories that exists in DB
    const existentCategories = await categoriesRepository.find({
      where: {
        // Method In handle with comparsion with arrays
        title: In(categories),
      },
    });

    // Populate an array with only the title of existent categories
    const existentCategoriesTitle = existentCategories.map(
      category => category.title,
    );

    // Get an array with arrays that is not created in DB
    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitle.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(transacation => ({
        title: transacation.title,
        value: transacation.value,
        type: transacation.type,
        category: finalCategories.find(
          category => category.title === transacation.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    // Delte CSV file
    await fs.promises.unlink(filePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
