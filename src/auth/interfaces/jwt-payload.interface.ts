import { MemberRole } from '../../library/entities/member.entity';

export interface JwtPayload {
    sub: number;
    email: string;
    role: MemberRole;
}