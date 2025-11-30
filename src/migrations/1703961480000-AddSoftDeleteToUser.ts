import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSoftDeleteToUser1703961480000 implements MigrationInterface {
    name = 'AddSoftDeleteToUser1703961480000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`users\` 
            ADD \`isDeleted\` tinyint NOT NULL DEFAULT 0
        `);
        
        await queryRunner.query(`
            ALTER TABLE \`users\` 
            ADD \`deletedAt\` timestamp NULL
        `);
        
        await queryRunner.query(`
            ALTER TABLE \`users\` 
            ADD \`originalName\` varchar(255) NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`originalName\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`deletedAt\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`isDeleted\``);
    }
}