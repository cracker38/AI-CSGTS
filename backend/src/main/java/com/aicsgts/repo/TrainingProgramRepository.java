package com.aicsgts.repo;

import com.aicsgts.domain.TrainingProgram;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TrainingProgramRepository extends JpaRepository<TrainingProgram, Long> {
  @Query("select tp from TrainingProgram tp where tp.skill.id = :skillId")
  List<TrainingProgram> findBySkillId(@Param("skillId") Long skillId);
}

