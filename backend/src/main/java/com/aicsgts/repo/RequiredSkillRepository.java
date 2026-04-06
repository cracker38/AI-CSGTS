package com.aicsgts.repo;

import com.aicsgts.domain.RequiredSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RequiredSkillRepository extends JpaRepository<RequiredSkill, Long> {
  @Query("select rs from RequiredSkill rs where rs.jobRole.id = :jobRoleId")
  List<RequiredSkill> findByJobRoleId(@Param("jobRoleId") Long jobRoleId);
}

