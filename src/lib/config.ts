import * as Zod from 'zod';
import * as Crypto from 'crypto';

export const ConfigSubmoduleSchema = Zod.object({
    name: Zod.string(),
    path: Zod.string(),
    url: Zod.string().optional(),
    tags: Zod.string().array().optional()
});
export const ConfigFeatureSchema = Zod.object({
    name: Zod.string(),
    branchName: Zod.string(),
    sourceSha: Zod.string(),
    upstream: Zod.string().optional()
});
export const ConfigReleaseSchema = Zod.object({
    name: Zod.string(),
    branchName: Zod.string(),
    sourceSha: Zod.string(),
    upstream: Zod.string().optional(),
    intermediate: Zod.boolean().optional()
});
export const ConfigHotfixSchema = Zod.object({
    name: Zod.string(),
    branchName: Zod.string(),
    sourceSha: Zod.string(),
    upstream: Zod.string().optional(),
    intermediate: Zod.boolean().optional()
});
export const ConfigSupportSchema = Zod.object({
    name: Zod.string(),
    masterBranchName: Zod.string(),
    developBranchName: Zod.string(),
    sourceSha: Zod.string(),
    upstream: Zod.string().optional(),
    features: ConfigFeatureSchema.array().optional(),
    releases: ConfigReleaseSchema.array().optional(),
    hotfixes: ConfigHotfixSchema.array().optional()
});
export const ConfigSchema = Zod.object({
    identifier: Zod.string(),
    managed: Zod.boolean().optional(),
    upstreams: Zod.object({
        name: Zod.string(),
        url: Zod.string()
    }).array().optional(),
    submodules: ConfigSubmoduleSchema.array().optional(),
    features: ConfigFeatureSchema.array().optional(),
    releases: ConfigReleaseSchema.array().optional(),
    hotfixes: ConfigHotfixSchema.array().optional(),
    supports: ConfigSupportSchema.array().optional(),
    included: Zod.string().array().optional(),
    excluded: Zod.string().array().optional(),
    featureMessageTemplate: Zod.string().optional(),
    releaseMessageTemplate: Zod.string().optional(),
    hotfixMessageTemplate: Zod.string().optional(),
    releaseTagTemplate: Zod.string().optional(),
    hotfixTagTemplate: Zod.string().optional(),
    tags: Zod.string().array().optional()
});

export type RecursiveConfigSubmoduleSchema = Zod.infer<typeof ConfigSubmoduleSchema> & {
    config?: RecursiveConfigSchema
};
export const RecursiveConfigSubmoduleSchema: Zod.ZodType<RecursiveConfigSubmoduleSchema> = Zod.lazy(() => ConfigSubmoduleSchema.extend({
    config: RecursiveConfigSchema.optional()
}));

export type RecursiveConfigSchema = Zod.infer<typeof ConfigSchema> & {
    submodules?: RecursiveConfigSubmoduleSchema[]
};
export const RecursiveConfigSchema: Zod.ZodType<RecursiveConfigSchema> = Zod.lazy(() => ConfigSchema.extend({
    submodules: RecursiveConfigSubmoduleSchema.array().optional()
}));

export class ConfigBase {
    readonly identifier!: string;
    readonly managed!: boolean;
    readonly upstreams!: readonly {
        readonly name: string;
        readonly url: string
    }[];
    readonly submodules!: readonly SubmoduleBase[];
    readonly features!: readonly FeatureBase[];
    readonly releases!: readonly ReleaseBase[];
    readonly hotfixes!: readonly HotfixBase[];
    readonly supports!: readonly SupportBase[];
    readonly included!: readonly string[];
    readonly excluded!: readonly string[];
    readonly featureMessageTemplate?: string;
    readonly releaseMessageTemplate?: string;
    readonly hotfixMessageTemplate?: string;
    readonly releaseTagTemplate?: string;
    readonly hotfixTagTemplate?: string;
    readonly tags!: readonly string[];

    public calculateHash({ algorithm = 'sha256', encoding = 'hex' }: { algorithm?: string, encoding?: Crypto.BinaryToTextEncoding } = {}) {
        const hash = Crypto.createHash(algorithm);
        this.updateHash(hash);

        return hash.digest(encoding);
    }
    public updateHash(hash: Crypto.Hash) {
        hash.update(this.identifier);

        if (!this.managed)
            hash.update('unmanaged');

        for (const upstream of this.upstreams) {
            hash.update(upstream.name);
            hash.update(upstream.url);
        }

        for (const include of this.included)
            hash.update(include)
        for (const exclude of this.excluded)
            hash.update(exclude);

        for (const submodule of this.submodules)
            submodule.updateHash(hash);
        for (const feature of this.features)
            feature.updateHash(hash);
        for (const release of this.releases)
            release.updateHash(hash);
        for (const hotfix of this.hotfixes)
            hotfix.updateHash(hash);
        for (const support of this.supports)
            support.updateHash(hash);

        this.featureMessageTemplate && hash.update(this.featureMessageTemplate);
        this.releaseMessageTemplate && hash.update(this.releaseMessageTemplate);
        this.hotfixMessageTemplate && hash.update(this.hotfixMessageTemplate);
        this.releaseTagTemplate && hash.update(this.releaseTagTemplate);
        this.hotfixTagTemplate && hash.update(this.hotfixTagTemplate);

        for (const tag of this.tags)
            hash.update(tag);

        return this;
    }

    public toHash() {
        return {
            identifier: this.identifier,
            managed: this.managed === false ? this.managed : undefined,
            upstreams: this.upstreams.slice(),
            submodules: this.submodules.length ? this.submodules.map(i => i.toHash()) : undefined,
            features: this.features.length ? this.features.map(i => i.toHash()) : undefined,
            releases: this.releases.length ? this.releases.map(i => i.toHash()) : undefined,
            hotfixes: this.hotfixes.length ? this.hotfixes.map(i => i.toHash()) : undefined,
            supports: this.supports.length ? this.supports.map(i => i.toHash()) : undefined,
            included: this.included.length ? this.included.slice() : undefined,
            excluded: this.excluded.length ? this.excluded.slice() : undefined,
            featureMessageTemplate: this.featureMessageTemplate,
            releaseMessageTemplate: this.releaseMessageTemplate,
            hotfixMessageTemplate: this.hotfixMessageTemplate,
            releaseTagTemplate: this.releaseTagTemplate,
            hotfixTagTemplate: this.hotfixTagTemplate,
            tags: this.tags.length ? this.tags.slice() : undefined
        }
    }
}
export class SubmoduleBase {
    readonly name!: string;
    readonly path!: string;
    readonly url?: string;
    readonly tags!: readonly string[];

    public updateHash(hash: Crypto.Hash) {
        hash.update(this.name);
        hash.update(this.path);
        this.url && hash.update(this.url);

        for (const tag of this.tags)
            hash.update(tag);

        return this;
    }

    public toHash() {
        return {
            name: this.name,
            path: this.path,
            url: this.url,
            tags: this.tags.length ? this.tags.slice() : undefined
        }
    }
}
export class FeatureBase {
    readonly name!: string;
    readonly branchName!: string;
    readonly sourceSha!: string;
    readonly upstream?: string;

    public updateHash(hash: Crypto.Hash) {
        hash.update(this.name);
        hash.update(this.branchName);
        hash.update(this.sourceSha);

        this.upstream && hash.update(this.upstream);

        return this;
    }

    public toHash() {
        return {
            name: this.name,
            branchName: this.branchName,
            sourceSha: this.sourceSha,
            upstream: this.upstream
        }
    }
}
export class ReleaseBase {
    readonly name!: string;
    readonly branchName!: string;
    readonly sourceSha!: string;
    readonly upstream?: string;
    readonly intermediate!: boolean;

    public updateHash(hash: Crypto.Hash) {
        hash.update(this.name);
        hash.update(this.branchName);
        hash.update(this.sourceSha);

        this.upstream && hash.update(this.upstream);

        hash.update(this.intermediate.toString());

        return this;
    }

    public toHash() {
        return {
            name: this.name,
            branchName: this.branchName,
            sourceSha: this.sourceSha,
            upstream: this.upstream,
            intermediate: this.intermediate
        }
    }
}
export class HotfixBase {
    readonly name!: string;
    readonly branchName!: string;
    readonly sourceSha!: string;
    readonly upstream?: string;
    readonly intermediate!: boolean;

    public updateHash(hash: Crypto.Hash) {
        hash.update(this.name);
        hash.update(this.branchName);
        hash.update(this.sourceSha);

        this.upstream && hash.update(this.upstream);

        hash.update(this.intermediate.toString());

        return this;
    }

    public toHash() {
        return {
            name: this.name,
            branchName: this.branchName,
            sourceSha: this.sourceSha,
            upstream: this.upstream,
            intermediate: this.intermediate
        }
    }
}
export class SupportBase {
    readonly name!: string;
    readonly masterBranchName!: string;
    readonly developBranchName!: string;
    readonly sourceSha!: string;
    readonly upstream?: string;

    readonly features!: readonly FeatureBase[];
    readonly releases!: readonly ReleaseBase[];
    readonly hotfixes!: readonly HotfixBase[];

    public updateHash(hash: Crypto.Hash) {
        hash.update(this.name);
        hash.update(this.masterBranchName);
        hash.update(this.developBranchName);
        hash.update(this.sourceSha);

        this.upstream && hash.update(this.upstream);

        for (const feature of this.features)
            feature.updateHash(hash);
        for (const release of this.releases)
            release.updateHash(hash);
        for (const hotfix of this.hotfixes)
            hotfix.updateHash(hash);

        return this;
    }

    public toHash() {
        return {
            name: this.name,
            masterBranchName: this.masterBranchName,
            developBranchName: this.developBranchName,
            sourceSha: this.sourceSha,
            upstream: this.upstream,
            features: this.features.map(i => i.toHash()),
            releases: this.releases.map(i => i.toHash()),
            hotfixes: this.hotfixes.map(i => i.toHash())
        }
    }
}

export const ConfigUriSchema = Zod.string().url().transform(value => {
    const parts = value.split('://');

    return Zod.object({
        protocol: Zod.union([
            Zod.literal('config'),
            Zod.literal('file'),
            Zod.literal('branch'),
            Zod.literal('http'),
            Zod.literal('https'),
            Zod.literal('glfs')
        ]),
        qualifier: Zod.string()
    }).parse({
        protocol: parts[0],
        qualifier: parts[1]
    });
});

export type ConfigReference = {
    type: 'config';
} | {
    type: 'file';
    path: string;
} | {
    type: 'branch';
    branchName: string;
} | {
    type: 'http';
    protocol: string;
    url: string;
} | {
    type: 'glfs';
    hostname?: string;
    namespace: string;
    name: string;
}
export function parseConfigReference(uri: string): ConfigReference {
    const { protocol, qualifier } = ConfigUriSchema.parse(uri);

    if (protocol === 'config') {
        return {
            type: protocol
        }
    }
    else if (protocol === 'file') {
        return {
            type: protocol,
            path: qualifier
        }
    }
    else if (protocol === 'branch') {
        return {
            type: protocol,
            branchName: qualifier
        }
    }
    else if (protocol === 'http' || protocol === 'https') {
        return {
            type: 'http',
            protocol,
            url: qualifier
        }
    }
    else if (protocol === 'glfs') {
        const parts = qualifier.split('/');

        if (parts.length === 3) {
            return {
                type: protocol,
                hostname: parts[0],
                namespace: parts[1],
                name: parts[2]
            }
        }
        else if (parts.length === 2) {
            return {
                type: protocol,
                namespace: parts[0],
                name: parts[1]
            }
        }
        else {
            throw new Error(`GLFS Uri invalid [${uri}]`)
        }
    }

    throw new Error(`Unsupported config protocol ${protocol}`);
}

export const ElementSchema = Zod.tuple([
    Zod.union([
        Zod.literal('branch'),
        Zod.literal('repo'),
        Zod.literal('feature'),
        Zod.literal('release'),
        Zod.literal('hotfix'),
        Zod.literal('support')
    ]),
    Zod.string()
]);

export const ElementUriSchema = Zod.string().url().transform(value => {
    const parts = value.split('://');

    return Zod.object({
        type: Zod.union([
            Zod.literal('feature'),
            Zod.literal('release'),
            Zod.literal('hotfix'),
            Zod.literal('support')
        ]),
        qualifier: Zod.string()
    }).parse({
        type: parts[0],
        qualifier: parts[1]
    });
});
export function parseElementUri(uri: string) {
    return ElementUriSchema.parse(uri);
}
