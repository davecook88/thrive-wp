import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { TeacherGoogleCredential } from "./entities/teacher-google-credential.entity.js";
import { SessionMeetEvent } from "./entities/session-meet-event.entity.js";
import { Session } from "../sessions/entities/session.entity.js";
import { EncryptionService } from "./services/encryption.service.js";
import { GoogleAuthService } from "./services/google-auth.service.js";
import { MeetingService } from "./services/meeting.service.js";
import { MeetEventListener } from "./listeners/meet-event.listener.js";
import { GoogleMeetController } from "./google-meet.controller.js";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      TeacherGoogleCredential,
      SessionMeetEvent,
      Session,
    ]),
  ],
  controllers: [GoogleMeetController],
  providers: [
    EncryptionService,
    GoogleAuthService,
    MeetingService,
    MeetEventListener,
  ],
  exports: [GoogleAuthService, MeetingService, EncryptionService],
})
export class GoogleMeetModule {}
