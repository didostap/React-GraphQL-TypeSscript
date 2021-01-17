import {Arg, Ctx, Field, InputType, Int, Mutation, Query, Resolver, UseMiddleware} from "type-graphql";
import {getConnection} from "typeorm";

import {Post} from "../entities/Post";
import {MyContext} from "../types";
import {isAuth} from "../middleware/isAuth";

@InputType()
class PostInput {
    @Field()
    title: string;

    @Field()
    text: string;
}

@Resolver()
export default class PostResolver {
    @Query(() => [Post])
    posts(
        @Arg("limit", () => Int) limit: number,
        @Arg("cursor", () => String, {nullable: true}) cursor: string | null,
    ): Promise<Post[]> {
        const realLimit = Math.min(50, limit);

        const qb = getConnection()
            .getRepository(Post)
            .createQueryBuilder("q")
            .orderBy('"createdAt"', "DESC")
            .limit(realLimit);

        if (cursor) {
            qb.where('"createdAt" < :cursor', {
                cursor: new Date(parseInt(cursor))
            })
        }

        return qb.getMany();
    }

    @Query(() => Post, {nullable: true})
    post(
        @Arg('id',) id: number,
    ): Promise<Post | undefined> {
        return Post.findOne(id)
    }

    @Mutation(() => Post)
    @UseMiddleware(isAuth)
    async createPost(
        @Arg('input') input: PostInput,
        @Ctx() ctx: MyContext,
    ): Promise<Post> {
        return Post.create({
            ...input,
            creatorId: ctx.req.session.userId,
        }).save();
    }

    @Mutation(() => Post, {nullable: true})
    async updatePost(
        @Arg('id') id: number,
        @Arg('title') title: string,
    ): Promise<Post | null> {
        const post = await Post.findOne(id);
        if (!post) {
            return null;
        }

        if (title) {
            await Post.update({id}, {title});
        }

        return post;
    }

    @Mutation(() => Boolean)
    async deletePost(
        @Arg('id') id: number,
    ): Promise<boolean> {
        await Post.delete(id);
        return true;
    }
}
